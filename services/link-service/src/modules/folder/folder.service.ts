import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, IsNull } from 'typeorm';

import { Folder } from './folder.entity';
import { CreateFolderDto } from './dto/create-folder.dto';
import { UpdateFolderDto } from './dto/update-folder.dto';

@Injectable()
export class FolderService {
  constructor(
    @InjectRepository(Folder)
    private readonly folderRepository: Repository<Folder>,
  ) {}

  async create(
    createFolderDto: CreateFolderDto,
    userId: string,
    teamId: string,
  ): Promise<Folder> {
    // Validate parent folder if provided
    if (createFolderDto.parentId) {
      const parent = await this.folderRepository.findOne({
        where: { id: createFolderDto.parentId, teamId },
      });
      if (!parent) {
        throw new NotFoundException('Parent folder not found');
      }
    }

    const folder = this.folderRepository.create({
      ...createFolderDto,
      userId,
      teamId,
    });

    return this.folderRepository.save(folder);
  }

  async findAll(teamId: string): Promise<Folder[]> {
    return this.folderRepository.find({
      where: { teamId },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });
  }

  async findTree(teamId: string): Promise<Folder[]> {
    // Get root folders (no parent)
    const rootFolders = await this.folderRepository.find({
      where: { teamId, parentId: IsNull() },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    // Recursively load children
    for (const folder of rootFolders) {
      await this.loadChildren(folder, teamId);
    }

    return rootFolders;
  }

  private async loadChildren(folder: Folder, teamId: string): Promise<void> {
    const children = await this.folderRepository.find({
      where: { teamId, parentId: folder.id },
      order: { sortOrder: 'ASC', createdAt: 'DESC' },
    });

    folder.children = children;

    for (const child of children) {
      await this.loadChildren(child, teamId);
    }
  }

  async findOne(id: string): Promise<Folder> {
    const folder = await this.folderRepository.findOne({
      where: { id },
      relations: ['children'],
    });

    if (!folder) {
      throw new NotFoundException(`Folder with ID ${id} not found`);
    }

    return folder;
  }

  async update(id: string, updateFolderDto: UpdateFolderDto): Promise<Folder> {
    const folder = await this.findOne(id);

    // Prevent circular reference
    if (updateFolderDto.parentId && updateFolderDto.parentId === id) {
      throw new BadRequestException('Folder cannot be its own parent');
    }

    Object.assign(folder, updateFolderDto);
    return this.folderRepository.save(folder);
  }

  async remove(id: string): Promise<void> {
    const folder = await this.findOne(id);

    // Check if folder has children
    const hasChildren = await this.folderRepository.count({
      where: { parentId: id },
    });

    if (hasChildren > 0) {
      throw new BadRequestException(
        'Cannot delete folder with subfolders. Delete subfolders first.',
      );
    }

    await this.folderRepository.remove(folder);
  }

  async updateLinkCount(folderId: string, increment: number): Promise<void> {
    await this.folderRepository.increment({ id: folderId }, 'linkCount', increment);
  }

  async reorder(
    teamId: string,
    orderedIds: string[],
  ): Promise<void> {
    for (let i = 0; i < orderedIds.length; i++) {
      await this.folderRepository.update(
        { id: orderedIds[i], teamId },
        { sortOrder: i },
      );
    }
  }
}
