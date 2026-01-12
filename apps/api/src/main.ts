import { NestFactory } from '@nestjs/core'
import { ValidationPipe, Logger } from '@nestjs/common'
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger'
import { AppModule } from './app.module'
import { writeFileSync } from 'fs'
import { join } from 'path'
import helmet from 'helmet'
import { v4 as uuidv4 } from 'uuid'
import { Request, Response, NextFunction } from 'express'

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: process.env.NODE_ENV === 'production' 
      ? ['error', 'warn', 'log'] 
      : ['error', 'warn', 'log', 'debug', 'verbose'],
  })

  const logger = new Logger('Bootstrap')

  // Security: Helmet middleware
  app.use(helmet({
    contentSecurityPolicy: process.env.NODE_ENV === 'production' ? undefined : false,
  }))

  // Request correlation ID middleware
  app.use((req: Request, res: Response, next: NextFunction) => {
    const correlationId = req.headers['x-correlation-id'] as string || uuidv4()
    req.headers['x-correlation-id'] = correlationId
    res.setHeader('x-correlation-id', correlationId)
    next()
  })

  // Enable CORS
  app.enableCors({
    origin: process.env.CORS_ORIGIN?.split(',') || ['http://localhost:3000'],
    credentials: true,
  })

  // Global validation pipe
  app.setGlobalPrefix('api/v1')
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  )

  // Swagger/OpenAPI setup
  const config = new DocumentBuilder()
    .setTitle('HyperTrigger API')
    .setDescription(
      `Backend API for HyperTrigger - Cross-Asset Triggered Trading Platform.
      
This API provides:
- Real-time price data from HyperLiquid oracles
- Trigger management and monitoring
- User analytics and history
- System health status`,
    )
    .setVersion('1.0.0')
    .addServer('http://localhost:4000', 'Local Development')
    .addServer('https://api.hypertrigger.xyz', 'Production')
    .addTag('system', 'System health and status')
    .addTag('prices', 'Price data from HyperLiquid oracles')
    .addTag('tokens', 'Token information and metadata')
    .addTag('triggers', 'Trigger management and monitoring')
    .addTag('analytics', 'User and platform analytics')
    .build()

  const document = SwaggerModule.createDocument(app, config)

  // Export OpenAPI spec for Orval
  const outputPath = join(__dirname, '..', 'openapi.json')
  writeFileSync(outputPath, JSON.stringify(document, null, 2))
  console.log(`📄 OpenAPI spec exported to ${outputPath}`)

  SwaggerModule.setup('docs', app, document, {
    customSiteTitle: 'HyperTrigger API Docs',
    customCss: '.swagger-ui .topbar { display: none }',
  })

  const port = process.env.PORT || 4000
  await app.listen(port)

  logger.log(`🚀 HyperTrigger API running on http://localhost:${port}`)
  logger.log(`📚 API Docs available at http://localhost:${port}/docs`)
  logger.log(`📄 OpenAPI JSON at http://localhost:${port}/docs-json`)
}

bootstrap()

