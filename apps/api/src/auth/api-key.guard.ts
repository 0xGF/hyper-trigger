import { Injectable, CanActivate, ExecutionContext, UnauthorizedException } from '@nestjs/common'
import { ConfigService } from '@nestjs/config'
import { Reflector } from '@nestjs/core'

export const WORKER_API_KEY = 'worker-api-key'
export const WorkerOnly = () => (target: any, key?: string, descriptor?: any) => {
  Reflect.defineMetadata(WORKER_API_KEY, true, descriptor?.value || target)
  return descriptor || target
}

@Injectable()
export class ApiKeyGuard implements CanActivate {
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
      // If no API key configured, allow in development
      if (this.configService.get('NODE_ENV') === 'development') {
        return true
      }
      throw new UnauthorizedException('API key not configured')
    }

    if (apiKey !== validApiKey) {
      throw new UnauthorizedException('Invalid API key')
    }

    return true
  }
}

