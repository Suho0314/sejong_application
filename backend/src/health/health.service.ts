import { Injectable } from '@nestjs/common';

@Injectable()
export class HealthService {
  getHealth() {
    return {
      status: 'ok',
      service: 'sejong-backend',
      timestamp: new Date().toISOString(),
    };
  }
}
