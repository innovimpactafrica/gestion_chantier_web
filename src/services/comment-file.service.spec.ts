import { TestBed } from '@angular/core/testing';

import { CommentFileService } from './comment-file.service';

describe('CommentFileService', () => {
  let service: CommentFileService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(CommentFileService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
