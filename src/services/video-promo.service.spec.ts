import { TestBed } from '@angular/core/testing';

import { VideoPromoService } from './video-promo.service';

describe('VideoPromoService', () => {
  let service: VideoPromoService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(VideoPromoService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
