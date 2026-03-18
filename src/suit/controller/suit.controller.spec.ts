import { Test, TestingModule } from '@nestjs/testing';
import { SuitController } from './suit.controller';

describe('SuitController', () => {
  let controller: SuitController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [SuitController],
    }).compile();

    controller = module.get<SuitController>(SuitController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
