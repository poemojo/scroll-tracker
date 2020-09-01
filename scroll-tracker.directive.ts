import { AfterViewInit, Directive, ElementRef, NgZone, OnDestroy } from '@angular/core';
import { NavigationEnd, NavigationStart, Router } from '@angular/router';
import { Subscription } from 'rxjs/Subscription';

import { ScrollTrackerService } from './scroll-tracker.service';

@Directive({
  selector: '[scrollTracker]'
})
export class ScrollTrackerDirective implements AfterViewInit, OnDestroy {
  private element: HTMLElement;
  private enterSubscription: Subscription;
  private exitSubscription: Subscription;
  private intervalDuration: number = 250;
  private intervalId;
  private maxScrollAttempts: number = 5;
  private curScrollAttempts: number = 0;

  constructor(
    private elementRef: ElementRef,
    private router: Router,
    private scrollTrackerService: ScrollTrackerService,
    private zone: NgZone) { }

    ngAfterViewInit() {
      this.element = this.elementRef.nativeElement;

      /**
       * Listen for when the component's route is exited.
       * Store the current scroll position in the service.
       */
      this.exitSubscription = this.router.events
      .pairwise()
      .filter(([prevRouteEvent, currRouteEvent]) => (prevRouteEvent instanceof NavigationEnd && currRouteEvent instanceof NavigationStart))
      .do(() => this.clearScrollChecker())
      .map(([prevRouteEvent]) => this.scrollTrackerService.getUrlForEvent(prevRouteEvent))
      .subscribe(url => {
        this.scrollTrackerService.saveScroll(url, {
          elementId: this.element.id || null,
          position: this.element.scrollTop
        });
      });

      /**
       * Listen for when the component's route is re-entered.
       * Get the stored scroll position from the service, and prepare a scroll attempt.
       */
      this.enterSubscription = this.router.events
      .filter(event => event instanceof NavigationEnd)
      .map(event => this.scrollTrackerService.getUrlForEvent(event))
      .map(url => this.scrollTrackerService.getScroll(url))
      .filter(scrollPosition => scrollPosition && scrollPosition.elementId === this.element.id)
      .subscribe(scrollPosition => this.prepareScroll(scrollPosition.position));
    }

    prepareScroll(position: number) {
      this.zone.runOutsideAngular(() => {
        this.clearScrollChecker();
        this.intervalId = setInterval(() => {
          this.attemptScroll(position);
        }, this.intervalDuration);
      });
    }

    clearScrollChecker() {
      this.curScrollAttempts = 0;

      if (!this.intervalId) { return; }

      this.zone.runOutsideAngular(() => {
        clearInterval(this.intervalId);
      });
    }

    attemptScroll(position: number) {
      /**
       * If you've tried the maximum number of times, and the element does have
       * a scrollHeight, then at least scroll the element to the bottom.
       */
      if (this.curScrollAttempts === this.maxScrollAttempts) {
        if (this.element.scrollHeight > 0) {
          this.element.scrollTop = this.element.scrollHeight;
        }
        return this.clearScrollChecker();
      }

      /**
       * If the element is at least as tall as the desired scroll position,
       * scroll to the desired position.
       */
      if (this.element.scrollHeight >= position) {
        this.element.scrollTop = position;
        return this.clearScrollChecker();
      }

      this.curScrollAttempts++;
    }

    ngOnDestroy() {
      this.clearScrollChecker();
      this.exitSubscription && this.exitSubscription.unsubscribe();
      this.enterSubscription && this.enterSubscription.unsubscribe();
    }
}
