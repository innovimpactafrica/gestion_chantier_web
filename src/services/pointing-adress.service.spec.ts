import { TestBed } from '@angular/core/testing';

import { PointingAdressService } from './pointing-adress.service';

describe('PointingAdressService', () => {
  let service: PointingAdressService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(PointingAdressService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
