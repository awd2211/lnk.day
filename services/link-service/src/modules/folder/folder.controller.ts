import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  ForbiddenException,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth } from '@nestjs/swagger';

import {
  JwtAuthGuard,
  ScopeGuard,
  PermissionGuard,
  Permission,
  RequirePermissions,
  CurrentUser,
  ScopedTeamId,
  AuthenticatedUser,
  isPlatformAdmin,
} from '@lnk/nestjs-common';
import { FolderService } from './folder.service';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@ApiTags('folders')
@Controller('folders')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, ScopeGuard, PermissionGuard)
export class FolderController {
  constructor(private readonly folderService: FolderService) {}

  @Post()
  @RequirePermissions(Permission.LINKS_CREATE)
  @ApiOperation({ summary: '创建文件夹' })
  create(
    @Body() createFolderDto: CreateFolderDto,
    @CurrentUser() user: AuthenticatedUser,
    @ScopedTeamId() teamId: string,
  ) {
    return this.folderService.create(createFolderDto, user.id, teamId);
  }

  @Get()
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取文件夹列表' })
  findAll(@ScopedTeamId() teamId: string) {
    return this.folderService.findAll(teamId);
  }

  @Get('tree')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取文件夹树形结构' })
  findTree(@ScopedTeamId() teamId: string) {
    return this.folderService.findTree(teamId);
  }

  @Get(':id')
  @RequirePermissions(Permission.LINKS_VIEW)
  @ApiOperation({ summary: '获取单个文件夹' })
  async findOne(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const folder = await this.folderService.findOne(id);
    if (!isPlatformAdmin(user) && folder.teamId !== teamId) {
      throw new ForbiddenException('无权访问此文件夹');
    }
    return folder;
  }

  @Put(':id')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '更新文件夹' })
  async update(
    @Param('id') id: string,
    @Body() updateFolderDto: UpdateFolderDto,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
  ) {
    const folder = await this.folderService.findOne(id);
    if (!isPlatformAdmin(user) && folder.teamId !== teamId) {
      throw new ForbiddenException('无权修改此文件夹');
    }
    return this.folderService.update(id, updateFolderDto);
  }

  @Delete(':id')
  @RequirePermissions(Permission.LINKS_DELETE)
  @ApiOperation({ summary: '删除文件夹' })
  async remove(
    @Param('id') id: string,
    @ScopedTeamId() teamId: string,
    @CurrentUser() user: AuthenticatedUser,
    @Body() body?: { transferToFolderId?: string | null },
  ) {
    const folder = await this.folderService.findOne(id);
    if (!isPlatformAdmin(user) && folder.teamId !== teamId) {
      throw new ForbiddenException('无权删除此文件夹');
    }
    return this.folderService.remove(id, { transferToFolderId: body?.transferToFolderId });
  }

  @Post('reorder')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '重新排序文件夹' })
  reorder(
    @Body() body: { orderedIds: string[] },
    @ScopedTeamId() teamId: string,
  ) {
    return this.folderService.reorder(teamId, body.orderedIds);
  }

  @Post('recalculate-link-counts')
  @RequirePermissions(Permission.LINKS_EDIT)
  @ApiOperation({ summary: '重新计算文件夹链接数量（修复历史数据）' })
  async recalculateLinkCounts(@ScopedTeamId() teamId: string) {
    await this.folderService.recalculateLinkCounts(teamId);
    return { success: true, message: '链接数量已重新计算' };
  }
}
