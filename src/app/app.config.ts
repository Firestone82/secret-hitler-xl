import { ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { ActivatedRouteSnapshot, provideRouter, withHashLocation, withViewTransitions } from '@angular/router';
import { routes } from './app.routes';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    // hash URLs: GitHub Pages has no server-side routing. The page scrolls inside SimpleBar, so App resets the scroll itself.
    provideRouter(
      routes,
      withHashLocation(),
      // cross-fade between pages; no fade when only the fragment or a query changes on the same page
      withViewTransitions({
        skipInitialTransition: true,
        onViewTransitionCreated: ({ transition, from, to }) => {
          if (leaf(from).routeConfig === leaf(to).routeConfig) transition.skipTransition();
        },
      }),
    ),
  ],
};

function leaf(s: ActivatedRouteSnapshot): ActivatedRouteSnapshot {
  while (s.firstChild) s = s.firstChild;
  return s;
}
