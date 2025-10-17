import { Controller, Get } from '@nestjs/common';

@Controller('v1')
export class AppController {
  @Get('ping')
  ping() { return { ok: true }; }
}