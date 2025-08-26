import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EtudeBetComponent } from './etude-bet.component';

describe('EtudeBetComponent', () => {
  let component: EtudeBetComponent;
  let fixture: ComponentFixture<EtudeBetComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EtudeBetComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EtudeBetComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
