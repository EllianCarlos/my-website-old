import { async, ComponentFixture, TestBed } from '@angular/core/testing';

import { DetailsaboutmeComponent } from './detailsaboutme.component';

describe('DetailsaboutmeComponent', () => {
  let component: DetailsaboutmeComponent;
  let fixture: ComponentFixture<DetailsaboutmeComponent>;

  beforeEach(async(() => {
    TestBed.configureTestingModule({
      declarations: [ DetailsaboutmeComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DetailsaboutmeComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
