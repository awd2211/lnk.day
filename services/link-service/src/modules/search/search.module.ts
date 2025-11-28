import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';

import { SearchService } from './search.service';
import { SearchController } from './search.controller';
import { SavedSearch } from './entities/saved-search.entity';
import { SavedSearchService } from './saved-search.service';
import { SavedSearchController } from './saved-search.controller';

@Module({
  imports: [TypeOrmModule.forFeature([SavedSearch])],
  controllers: [SearchController, SavedSearchController],
  providers: [SearchService, SavedSearchService],
  exports: [SearchService, SavedSearchService],
})
export class SearchModule {}
