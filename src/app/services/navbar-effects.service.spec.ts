import { TestBed } from '@angular/core/testing';

import { NavbarEffectsService } from './navbar-effects.service';

describe('NavbarEffectsService', () => {
  let service: NavbarEffectsService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(NavbarEffectsService);
  });

  it('should be created', () => {
    expect(service).toBeTruthy();
  });
});
