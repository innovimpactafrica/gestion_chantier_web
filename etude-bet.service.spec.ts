import { TestBed } from '@angular/core/testing';

import { EtudeBetService } from './etude-bet.service';

describe('EtudeBetService', () => {
  let service: EtudeBetService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(EtudeBetService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
