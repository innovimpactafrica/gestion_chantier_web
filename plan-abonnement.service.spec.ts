import { TestBed } from '@angular/core/testing';

import { PlanAbonnementService } from './plan-abonnement.service';

describe('PlanAbonnementService', () => {
  let service: PlanAbonnementService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PlanAbonnementService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
