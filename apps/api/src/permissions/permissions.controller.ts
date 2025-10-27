import { Controller, Get, Patch, Param, Body } from '@nestjs/common';
import { PermissionsService } from './permissions.service';

@Controller('/v1/permissions')
export class PermissionsController {
  constructor(private readonly service: PermissionsService) {}

  @Get(':aff')
  getSettings(@Param('aff') aff: string) {
    return this.service.getSettings(aff);
  }

  @Patch(':aff')
  updateSettings(
    @Param('aff') aff: string,
    @Body() dto: {
      nameVisibility?: 'SHOW' | 'MASK' | 'HIDE';
      emailVisibility?: 'SHOW' | 'MASK' | 'HIDE';
      phoneVisibility?: 'SHOW' | 'MASK' | 'HIDE';
    }
  ) {
    return this.service.updateSettings(aff, dto);
  }
}


