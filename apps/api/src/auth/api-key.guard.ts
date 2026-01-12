import { Injectable, CanActivate, ExecutionContext, UnauthorizedException, Logger } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'

export const WORKER_API_KEY = 'worker-api-key'
export const WorkerOnly = () => (target: any, key?: string, descriptor?: any) => {
  Reflect.defineMetadata(WORKER_API_KEY, true, descriptor?.value || target)
  return descriptor || target
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
  private readonly logger = new Logger(ApiKeyGuard.name)
  
  constructor(
    private configService: ConfigService,
    private reflector: Reflector,
  ) {}

  canActivate(context: ExecutionContext): boolean {
    // Check if endpoint requires worker authentication
    const requiresWorkerAuth = this.reflector.get<boolean>(
      WORKER_API_KEY,
      context.getHandler(),
    )

    if (!requiresWorkerAuth) {
      return true // Public endpoint
    }

    const request = context.switchToHttp().getRequest()
    const apiKey = request.headers['x-api-key'] || request.headers['authorization']?.replace('Bearer ', '')

    const validApiKey = this.configService.get<string>('WORKER_API_KEY')
    
    if (!validApiKey) {
      // SECURITY: Never allow requests without API key in any environment
      // Log a warning in development to help debugging
      const nodeEnv = this.configService.get('NODE_ENV')
      if (nodeEnv === 'development') {
        this.logger.warn('WORKER_API_KEY not configured - set it in .env.local for worker authentication')
      }
      throw new UnauthorizedException('API key not configured on server')
    }

    if (!apiKey) {
      throw new UnauthorizedException('API key required')
    }

    // Constant-time comparison to prevent timing attacks
    if (!this.secureCompare(apiKey, validApiKey)) {
      throw new UnauthorizedException('Invalid API key')
    }

    return true
  }
  
  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private secureCompare(a: string, b: string): boolean {
    if (a.length !== b.length) {
      return false
    }
    
    let result = 0
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i)
    }
    return result === 0
  }
}

