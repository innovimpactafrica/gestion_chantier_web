import { TestBed } from '@angular/core/testing';

import { RealestateService } from './realestate.service';

describe('RealestateService', () => {
  let service: RealestateService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(RealestateService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });

  it('should not prepend the base URL when the project plan is already a full URL', () => {
    expect(service.normalizeMediaUrl('https://cdn.example.com/chantier-1/plan.png')).toBe('https://cdn.example.com/chantier-1/plan.png');
    expect(service.normalizeMediaUrl('/uploads/chantier-1/plan.png')).toBe('https://api.btpcloud.sn/repertoire_chantier/uploads/chantier-1/plan.png');
    expect(service.normalizeMediaUrl('uploads/chantier-1/plan.png')).toBe('https://api.btpcloud.sn/repertoire_chantier/uploads/chantier-1/plan.png');
  });
});
