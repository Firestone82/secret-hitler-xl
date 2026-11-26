import { inject } from '@angular/core';
import { Router, Routes } from '@angular/router';
import { RulesPage } from './pages/rules/rules';
import { RolesPage } from './pages/roles/roles';

export const routes: Routes = [
  { path: '', pathMatch: 'full', loadComponent: () => import('./pages/home/home').then((m) => m.HomePage), title: 'Secret Hitler + XL: rules, roles and print builder' },
  { path: 'rules', component: RulesPage, title: 'Rules · Secret Hitler + XL' },
  { path: 'roles', component: RolesPage, title: 'Roles · Secret Hitler + XL' },
  // the print builder carries pdf-lib, so it loads only when opened
  { path: 'print', loadComponent: () => import('./pages/print/print').then((m) => m.PrintPage), title: 'Print builder · Secret Hitler + XL' },
  // About is a section of the home page
  { path: 'about', redirectTo: () => inject(Router).createUrlTree([''], { fragment: 'about' }) },
  { path: 'versions', loadComponent: () => import('./pages/versions/versions').then((m) => m.VersionsPage), title: 'Version history · Secret Hitler + XL' },
  // Credits are a section of the home page too
  { path: 'credits', redirectTo: () => inject(Router).createUrlTree([''], { fragment: 'credits' }) },
  { path: '3d-printing', loadComponent: () => import('./pages/printing-3d/printing-3d').then((m) => m.Printing3dPage), title: '3D printing · Secret Hitler + XL' },
  { path: '**', redirectTo: '' },
];
