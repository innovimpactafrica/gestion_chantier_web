import { TestBed } from '@angular/core/testing';

import { DetailsWorkerService } from './details-worker.service';

describe('DetailsWorkerService', () => {
  let service: DetailsWorkerService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(DetailsWorkerService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
