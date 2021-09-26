import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { DiceTableSettingComponent } from './dice-table-setting.component';

describe('DiceTableSettingComponent', () => {
  let component: DiceTableSettingComponent;
  let fixture: ComponentFixture<DiceTableSettingComponent>;

  beforeEach(waitForAsync(() => {
    TestBed.configureTestingModule({
      declarations: [ DiceTableSettingComponent ]
    })
    .compileComponents();
  }));

  beforeEach(() => {
    fixture = TestBed.createComponent(DiceTableSettingComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
