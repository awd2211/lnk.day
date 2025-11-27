import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Headers,
  UseGuards,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../../common/decorators/current-user.decorator';

@ApiTags('folders')
@Controller('folders')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @ApiOperation({ summary: '创建文件夹' })
  create(
    @Body() createFolderDto: CreateFolderDto,
    @CurrentUser() user: { id: string },
    @Headers('x-team-id') teamId: string,
  ) {
    return this.folderService.create(createFolderDto, user.id, teamId || user.id);
  }

  @Get()
  @ApiOperation({ summary: '获取文件夹列表' })
  findAll(@Headers('x-team-id') teamId: string, @CurrentUser() user: { id: string }) {
    return this.folderService.findAll(teamId || user.id);
  }

  @Get('tree')
  @ApiOperation({ summary: '获取文件夹树形结构' })
  findTree(@Headers('x-team-id') teamId: string, @CurrentUser() user: { id: string }) {
    return this.folderService.findTree(teamId || user.id);
  }

  @Get(':id')
  @ApiOperation({ summary: '获取单个文件夹' })
  findOne(@Param('id') id: string) {
    return this.folderService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新文件夹' })
  update(@Param('id') id: string, @Body() updateFolderDto: UpdateFolderDto) {
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除文件夹' })
  remove(@Param('id') id: string) {
    return this.folderService.remove(id);
  }

  @Post('reorder')
  @ApiOperation({ summary: '重新排序文件夹' })
  reorder(
    @Body() body: { orderedIds: string[] },
    @Headers('x-team-id') teamId: string,
    @CurrentUser() user: { id: string },
  ) {
    return this.folderService.reorder(teamId || user.id, body.orderedIds);
  }
}
