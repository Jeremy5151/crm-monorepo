import { Controller, Get, Post, Patch, Delete, Body, Param } from '@nestjs/common';
import { BoxesService } from './boxes.service';

@Controller('v1/boxes')
export class BoxesController {
  constructor(private readonly boxesService: BoxesService) {}

  @Get()
  list() {
    return this.boxesService.list();
  }

  @Get(':id')
  get(@Param('id') id: string) {
    return this.boxesService.get(id);
  }

  @Post()
  create(@Body() data: {
    name: string;
    countries?: string[];
    isActive?: boolean;
    brokers: { 
      brokerId: string; 
      priority: number;
      deliveryEnabled?: boolean;
      deliveryFrom?: string;
      deliveryTo?: string;
      leadCap?: number;
    }[];
  }) {
    return this.boxesService.create(data);
  }

  @Patch(':id')
  update(
    @Param('id') id: string,
    @Body() data: {
      name?: string;
      countries?: string[];
      isActive?: boolean;
      brokers?: { 
        brokerId: string; 
        priority: number;
        deliveryEnabled?: boolean;
        deliveryFrom?: string;
        deliveryTo?: string;
        leadCap?: number;
      }[];
    }
  ) {
    return this.boxesService.update(id, data);
  }

  @Delete(':id')
  delete(@Param('id') id: string) {
    return this.boxesService.delete(id);
  }
}

