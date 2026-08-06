import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';
import { RoutesService } from './routes.service';
import { PriceEntity } from './entities/price.entity';
import { RouteEntity } from './entities/route.entity';

describe('RoutesService', () => {
  let service: RoutesService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoutesService,
        { provide: getRepositoryToken(RouteEntity), useValue: {} },
        { provide: getRepositoryToken(PriceEntity), useValue: {} },
      ],
    }).compile();

    service = module.get<RoutesService>(RoutesService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
