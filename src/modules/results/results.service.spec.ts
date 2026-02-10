import { Test, TestingModule } from '@nestjs/testing';
import { ResultsService } from './results.service';
import { getRepositoryToken } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Result } from './entities/result.entity';

describe('ResultsService', () => {
  let service: ResultsService;
  let repository: Repository<Result>;

  const mockRepository = {
    find: jest.fn(),
    findOne: jest.fn(),
    save: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        ResultsService,
        {
          provide: getRepositoryToken(Result),
          useValue: mockRepository,
        },
      ],
    }).compile();

    service = module.get<ResultsService>(ResultsService);
    repository = module.get<Repository<Result>>(getRepositoryToken(Result));
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('findAll', () => {
    it('should return an array of results', async () => {
      const results = [{ id: '1', studentId: '1', subjectId: '1', score: 85 }];
      mockRepository.find.mockResolvedValue(results);

      expect(await service.findAll()).toEqual(results);
    });
  });

  afterEach(() => {
    jest.clearAllMocks();
  });
});
