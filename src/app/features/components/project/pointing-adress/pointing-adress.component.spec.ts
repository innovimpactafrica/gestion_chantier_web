import { ComponentFixture, TestBed } from '@angular/core/testing';

import { PointingAdressComponent } from './pointing-adress.component';

describe('PointingAdressComponent', () => {
  let component: PointingAdressComponent;
  let fixture: ComponentFixture<PointingAdressComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [PointingAdressComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(PointingAdressComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
