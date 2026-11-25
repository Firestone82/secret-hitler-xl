import { Routes } from '@angular/router';
import { RulesPage } from './pages/rules/rules';
import { RolesPage } from './pages/roles/roles';

export const routes: Routes = [
  { path: '', pathMatch: 'full', redirectTo: 'rules' },
  { path: 'rules', component: RulesPage, title: 'Rules · Secret Hitler + XL' },
  { path: 'roles', component: RolesPage, title: 'Roles · Secret Hitler + XL' },
  // the print builder carries pdf-lib, so it loads only when opened
  { path: 'print', loadComponent: () => import('./pages/print/print').then((m) => m.PrintPage), title: 'Print builder · Secret Hitler + XL' },
  { path: 'about', loadComponent: () => import('./pages/about/about').then((m) => m.AboutPage), title: 'About · Secret Hitler + XL' },
  { path: 'credits', loadComponent: () => import('./pages/credits/credits').then((m) => m.CreditsPage), title: 'Credits · Secret Hitler + XL' },
  { path: '**', redirectTo: 'rules' },
];
