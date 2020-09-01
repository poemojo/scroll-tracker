import { Injectable } from '@angular/core';
import { NavigationEnd, NavigationStart } from '@angular/router';

export interface RouteScrollPositions {
  [url: string]: RouteScrollPosition;
}

export interface RouteScrollPosition {
  position: number;
  elementId: string;
}

@Injectable()
export class ScrollTrackerService {
  private routeScrollPositions: RouteScrollPositions = {};

  constructor() { }

  saveScroll(url: string, scrollPosition: RouteScrollPosition) {
    this.routeScrollPositions[url] = scrollPosition;
  }

  getScroll(url: string): RouteScrollPosition {
    return this.routeScrollPositions[url];
  }

  getUrlForEvent(event): string {
    if (event instanceof NavigationStart) {
      return event.url.split(';', 1)[0];
    }

    if (event instanceof NavigationEnd) {
      return (event.urlAfterRedirects || event.url).split(';', 1)[0];
    }
  }
}
