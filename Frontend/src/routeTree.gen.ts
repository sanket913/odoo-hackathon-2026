/* eslint-disable */

// @ts-nocheck

import { Route as rootRouteImport } from './routes/__root'
import { Route as ResetPasswordRouteImport } from './routes/reset-password'
import { Route as LoginRouteImport } from './routes/login'
import { Route as ForgotPasswordRouteImport } from './routes/forgot-password'
import { Route as AccessDeniedRouteImport } from './routes/access-denied'
import { Route as AuthenticatedRouteImport } from './routes/_authenticated'
import { Route as IndexRouteImport } from './routes/index'
import { Route as AuthenticatedTripsRouteImport } from './routes/_authenticated/trips'
import { Route as AuthenticatedSettingsRouteImport } from './routes/_authenticated/settings'
import { Route as AuthenticatedNotificationsRouteImport } from './routes/_authenticated/notifications'
import { Route as AuthenticatedMaintenanceRouteImport } from './routes/_authenticated/maintenance'
import { Route as AuthenticatedLiveOperationsRouteImport } from './routes/_authenticated/live-operations'
import { Route as AuthenticatedFuelExpensesRouteImport } from './routes/_authenticated/fuel-expenses'
import { Route as AuthenticatedFleetRouteImport } from './routes/_authenticated/fleet'
import { Route as AuthenticatedDriversRouteImport } from './routes/_authenticated/drivers'
import { Route as AuthenticatedDashboardRouteImport } from './routes/_authenticated/dashboard'
import { Route as AuthenticatedAnalyticsRouteImport } from './routes/_authenticated/analytics'
import { Route as AuthenticatedTripsNewRouteImport } from './routes/_authenticated/trips.new'
import { Route as AuthenticatedTripsTripIdRouteImport } from './routes/_authenticated/trips.$tripId'
import { Route as AuthenticatedMaintenanceNewRouteImport } from './routes/_authenticated/maintenance.new'
import { Route as AuthenticatedMaintenanceMaintenanceIdRouteImport } from './routes/_authenticated/maintenance.$maintenanceId'
import { Route as AuthenticatedFleetNewRouteImport } from './routes/_authenticated/fleet.new'
import { Route as AuthenticatedFleetVehicleIdRouteImport } from './routes/_authenticated/fleet.$vehicleId'
import { Route as AuthenticatedDriversNewRouteImport } from './routes/_authenticated/drivers.new'
import { Route as AuthenticatedDriversDriverIdRouteImport } from './routes/_authenticated/drivers.$driverId'
import { Route as AuthenticatedFleetVehicleIdEditRouteImport } from './routes/_authenticated/fleet.$vehicleId.edit'
import { Route as AuthenticatedDriversDriverIdEditRouteImport } from './routes/_authenticated/drivers.$driverId.edit'

const ResetPasswordRoute = ResetPasswordRouteImport.update({
  id: '/reset-password',
  path: '/reset-password',
  getParentRoute: () => rootRouteImport,
} as any)
const LoginRoute = LoginRouteImport.update({
  id: '/login',
  path: '/login',
  getParentRoute: () => rootRouteImport,
} as any)
const ForgotPasswordRoute = ForgotPasswordRouteImport.update({
  id: '/forgot-password',
  path: '/forgot-password',
  getParentRoute: () => rootRouteImport,
} as any)
const AccessDeniedRoute = AccessDeniedRouteImport.update({
  id: '/access-denied',
  path: '/access-denied',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedRoute = AuthenticatedRouteImport.update({
  id: '/_authenticated',
  getParentRoute: () => rootRouteImport,
} as any)
const IndexRoute = IndexRouteImport.update({
  id: '/',
  path: '/',
  getParentRoute: () => rootRouteImport,
} as any)
const AuthenticatedTripsRoute = AuthenticatedTripsRouteImport.update({
  id: '/trips',
  path: '/trips',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedSettingsRoute = AuthenticatedSettingsRouteImport.update({
  id: '/settings',
  path: '/settings',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedNotificationsRoute =
  AuthenticatedNotificationsRouteImport.update({
    id: '/notifications',
    path: '/notifications',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedMaintenanceRoute =
  AuthenticatedMaintenanceRouteImport.update({
    id: '/maintenance',
    path: '/maintenance',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedLiveOperationsRoute =
  AuthenticatedLiveOperationsRouteImport.update({
    id: '/live-operations',
    path: '/live-operations',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedFuelExpensesRoute =
  AuthenticatedFuelExpensesRouteImport.update({
    id: '/fuel-expenses',
    path: '/fuel-expenses',
    getParentRoute: () => AuthenticatedRoute,
  } as any)
const AuthenticatedFleetRoute = AuthenticatedFleetRouteImport.update({
  id: '/fleet',
  path: '/fleet',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedDriversRoute = AuthenticatedDriversRouteImport.update({
  id: '/drivers',
  path: '/drivers',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedDashboardRoute = AuthenticatedDashboardRouteImport.update({
  id: '/dashboard',
  path: '/dashboard',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedAnalyticsRoute = AuthenticatedAnalyticsRouteImport.update({
  id: '/analytics',
  path: '/analytics',
  getParentRoute: () => AuthenticatedRoute,
} as any)
const AuthenticatedTripsNewRoute = AuthenticatedTripsNewRouteImport.update({
  id: '/new',
  path: '/new',
  getParentRoute: () => AuthenticatedTripsRoute,
} as any)
const AuthenticatedTripsTripIdRoute =
  AuthenticatedTripsTripIdRouteImport.update({
    id: '/$tripId',
    path: '/$tripId',
    getParentRoute: () => AuthenticatedTripsRoute,
  } as any)
const AuthenticatedMaintenanceNewRoute =
  AuthenticatedMaintenanceNewRouteImport.update({
    id: '/new',
    path: '/new',
    getParentRoute: () => AuthenticatedMaintenanceRoute,
  } as any)
const AuthenticatedMaintenanceMaintenanceIdRoute =
  AuthenticatedMaintenanceMaintenanceIdRouteImport.update({
    id: '/$maintenanceId',
    path: '/$maintenanceId',
    getParentRoute: () => AuthenticatedMaintenanceRoute,
  } as any)
const AuthenticatedFleetNewRoute = AuthenticatedFleetNewRouteImport.update({
  id: '/new',
  path: '/new',
  getParentRoute: () => AuthenticatedFleetRoute,
} as any)
const AuthenticatedFleetVehicleIdRoute =
  AuthenticatedFleetVehicleIdRouteImport.update({
    id: '/$vehicleId',
    path: '/$vehicleId',
    getParentRoute: () => AuthenticatedFleetRoute,
  } as any)
const AuthenticatedDriversNewRoute = AuthenticatedDriversNewRouteImport.update({
  id: '/new',
  path: '/new',
  getParentRoute: () => AuthenticatedDriversRoute,
} as any)
const AuthenticatedDriversDriverIdRoute =
  AuthenticatedDriversDriverIdRouteImport.update({
    id: '/$driverId',
    path: '/$driverId',
    getParentRoute: () => AuthenticatedDriversRoute,
  } as any)
const AuthenticatedFleetVehicleIdEditRoute =
  AuthenticatedFleetVehicleIdEditRouteImport.update({
    id: '/edit',
    path: '/edit',
    getParentRoute: () => AuthenticatedFleetVehicleIdRoute,
  } as any)
const AuthenticatedDriversDriverIdEditRoute =
  AuthenticatedDriversDriverIdEditRouteImport.update({
    id: '/edit',
    path: '/edit',
    getParentRoute: () => AuthenticatedDriversDriverIdRoute,
  } as any)

export interface FileRoutesByFullPath {
  '/': typeof IndexRoute
  '/access-denied': typeof AccessDeniedRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/reset-password': typeof ResetPasswordRoute
  '/analytics': typeof AuthenticatedAnalyticsRoute
  '/dashboard': typeof AuthenticatedDashboardRoute
  '/drivers': typeof AuthenticatedDriversRouteWithChildren
  '/fleet': typeof AuthenticatedFleetRouteWithChildren
  '/fuel-expenses': typeof AuthenticatedFuelExpensesRoute
  '/live-operations': typeof AuthenticatedLiveOperationsRoute
  '/maintenance': typeof AuthenticatedMaintenanceRouteWithChildren
  '/notifications': typeof AuthenticatedNotificationsRoute
  '/settings': typeof AuthenticatedSettingsRoute
  '/trips': typeof AuthenticatedTripsRouteWithChildren
  '/drivers/$driverId': typeof AuthenticatedDriversDriverIdRouteWithChildren
  '/drivers/new': typeof AuthenticatedDriversNewRoute
  '/fleet/$vehicleId': typeof AuthenticatedFleetVehicleIdRouteWithChildren
  '/fleet/new': typeof AuthenticatedFleetNewRoute
  '/maintenance/$maintenanceId': typeof AuthenticatedMaintenanceMaintenanceIdRoute
  '/maintenance/new': typeof AuthenticatedMaintenanceNewRoute
  '/trips/$tripId': typeof AuthenticatedTripsTripIdRoute
  '/trips/new': typeof AuthenticatedTripsNewRoute
  '/drivers/$driverId/edit': typeof AuthenticatedDriversDriverIdEditRoute
  '/fleet/$vehicleId/edit': typeof AuthenticatedFleetVehicleIdEditRoute
}
export interface FileRoutesByTo {
  '/': typeof IndexRoute
  '/access-denied': typeof AccessDeniedRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/reset-password': typeof ResetPasswordRoute
  '/analytics': typeof AuthenticatedAnalyticsRoute
  '/dashboard': typeof AuthenticatedDashboardRoute
  '/drivers': typeof AuthenticatedDriversRouteWithChildren
  '/fleet': typeof AuthenticatedFleetRouteWithChildren
  '/fuel-expenses': typeof AuthenticatedFuelExpensesRoute
  '/live-operations': typeof AuthenticatedLiveOperationsRoute
  '/maintenance': typeof AuthenticatedMaintenanceRouteWithChildren
  '/notifications': typeof AuthenticatedNotificationsRoute
  '/settings': typeof AuthenticatedSettingsRoute
  '/trips': typeof AuthenticatedTripsRouteWithChildren
  '/drivers/$driverId': typeof AuthenticatedDriversDriverIdRouteWithChildren
  '/drivers/new': typeof AuthenticatedDriversNewRoute
  '/fleet/$vehicleId': typeof AuthenticatedFleetVehicleIdRouteWithChildren
  '/fleet/new': typeof AuthenticatedFleetNewRoute
  '/maintenance/$maintenanceId': typeof AuthenticatedMaintenanceMaintenanceIdRoute
  '/maintenance/new': typeof AuthenticatedMaintenanceNewRoute
  '/trips/$tripId': typeof AuthenticatedTripsTripIdRoute
  '/trips/new': typeof AuthenticatedTripsNewRoute
  '/drivers/$driverId/edit': typeof AuthenticatedDriversDriverIdEditRoute
  '/fleet/$vehicleId/edit': typeof AuthenticatedFleetVehicleIdEditRoute
}
export interface FileRoutesById {
  __root__: typeof rootRouteImport
  '/': typeof IndexRoute
  '/_authenticated': typeof AuthenticatedRouteWithChildren
  '/access-denied': typeof AccessDeniedRoute
  '/forgot-password': typeof ForgotPasswordRoute
  '/login': typeof LoginRoute
  '/reset-password': typeof ResetPasswordRoute
  '/_authenticated/analytics': typeof AuthenticatedAnalyticsRoute
  '/_authenticated/dashboard': typeof AuthenticatedDashboardRoute
  '/_authenticated/drivers': typeof AuthenticatedDriversRouteWithChildren
  '/_authenticated/fleet': typeof AuthenticatedFleetRouteWithChildren
  '/_authenticated/fuel-expenses': typeof AuthenticatedFuelExpensesRoute
  '/_authenticated/live-operations': typeof AuthenticatedLiveOperationsRoute
  '/_authenticated/maintenance': typeof AuthenticatedMaintenanceRouteWithChildren
  '/_authenticated/notifications': typeof AuthenticatedNotificationsRoute
  '/_authenticated/settings': typeof AuthenticatedSettingsRoute
  '/_authenticated/trips': typeof AuthenticatedTripsRouteWithChildren
  '/_authenticated/drivers/$driverId': typeof AuthenticatedDriversDriverIdRouteWithChildren
  '/_authenticated/drivers/new': typeof AuthenticatedDriversNewRoute
  '/_authenticated/fleet/$vehicleId': typeof AuthenticatedFleetVehicleIdRouteWithChildren
  '/_authenticated/fleet/new': typeof AuthenticatedFleetNewRoute
  '/_authenticated/maintenance/$maintenanceId': typeof AuthenticatedMaintenanceMaintenanceIdRoute
  '/_authenticated/maintenance/new': typeof AuthenticatedMaintenanceNewRoute
  '/_authenticated/trips/$tripId': typeof AuthenticatedTripsTripIdRoute
  '/_authenticated/trips/new': typeof AuthenticatedTripsNewRoute
  '/_authenticated/drivers/$driverId/edit': typeof AuthenticatedDriversDriverIdEditRoute
  '/_authenticated/fleet/$vehicleId/edit': typeof AuthenticatedFleetVehicleIdEditRoute
}
export interface FileRouteTypes {
  fileRoutesByFullPath: FileRoutesByFullPath
  fullPaths:
    | '/'
    | '/access-denied'
    | '/forgot-password'
    | '/login'
    | '/reset-password'
    | '/analytics'
    | '/dashboard'
    | '/drivers'
    | '/fleet'
    | '/fuel-expenses'
    | '/live-operations'
    | '/maintenance'
    | '/notifications'
    | '/settings'
    | '/trips'
    | '/drivers/$driverId'
    | '/drivers/new'
    | '/fleet/$vehicleId'
    | '/fleet/new'
    | '/maintenance/$maintenanceId'
    | '/maintenance/new'
    | '/trips/$tripId'
    | '/trips/new'
    | '/drivers/$driverId/edit'
    | '/fleet/$vehicleId/edit'
  fileRoutesByTo: FileRoutesByTo
  to:
    | '/'
    | '/access-denied'
    | '/forgot-password'
    | '/login'
    | '/reset-password'
    | '/analytics'
    | '/dashboard'
    | '/drivers'
    | '/fleet'
    | '/fuel-expenses'
    | '/live-operations'
    | '/maintenance'
    | '/notifications'
    | '/settings'
    | '/trips'
    | '/drivers/$driverId'
    | '/drivers/new'
    | '/fleet/$vehicleId'
    | '/fleet/new'
    | '/maintenance/$maintenanceId'
    | '/maintenance/new'
    | '/trips/$tripId'
    | '/trips/new'
    | '/drivers/$driverId/edit'
    | '/fleet/$vehicleId/edit'
  id:
    | '__root__'
    | '/'
    | '/_authenticated'
    | '/access-denied'
    | '/forgot-password'
    | '/login'
    | '/reset-password'
    | '/_authenticated/analytics'
    | '/_authenticated/dashboard'
    | '/_authenticated/drivers'
    | '/_authenticated/fleet'
    | '/_authenticated/fuel-expenses'
    | '/_authenticated/live-operations'
    | '/_authenticated/maintenance'
    | '/_authenticated/notifications'
    | '/_authenticated/settings'
    | '/_authenticated/trips'
    | '/_authenticated/drivers/$driverId'
    | '/_authenticated/drivers/new'
    | '/_authenticated/fleet/$vehicleId'
    | '/_authenticated/fleet/new'
    | '/_authenticated/maintenance/$maintenanceId'
    | '/_authenticated/maintenance/new'
    | '/_authenticated/trips/$tripId'
    | '/_authenticated/trips/new'
    | '/_authenticated/drivers/$driverId/edit'
    | '/_authenticated/fleet/$vehicleId/edit'
  fileRoutesById: FileRoutesById
}
export interface RootRouteChildren {
  IndexRoute: typeof IndexRoute
  AuthenticatedRoute: typeof AuthenticatedRouteWithChildren
  AccessDeniedRoute: typeof AccessDeniedRoute
  ForgotPasswordRoute: typeof ForgotPasswordRoute
  LoginRoute: typeof LoginRoute
  ResetPasswordRoute: typeof ResetPasswordRoute
}

declare module '@tanstack/react-router' {
  interface FileRoutesByPath {
    '/reset-password': {
      id: '/reset-password'
      path: '/reset-password'
      fullPath: '/reset-password'
      preLoaderRoute: typeof ResetPasswordRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/login': {
      id: '/login'
      path: '/login'
      fullPath: '/login'
      preLoaderRoute: typeof LoginRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/forgot-password': {
      id: '/forgot-password'
      path: '/forgot-password'
      fullPath: '/forgot-password'
      preLoaderRoute: typeof ForgotPasswordRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/access-denied': {
      id: '/access-denied'
      path: '/access-denied'
      fullPath: '/access-denied'
      preLoaderRoute: typeof AccessDeniedRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated': {
      id: '/_authenticated'
      path: ''
      fullPath: '/'
      preLoaderRoute: typeof AuthenticatedRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/': {
      id: '/'
      path: '/'
      fullPath: '/'
      preLoaderRoute: typeof IndexRouteImport
      parentRoute: typeof rootRouteImport
    }
    '/_authenticated/trips': {
      id: '/_authenticated/trips'
      path: '/trips'
      fullPath: '/trips'
      preLoaderRoute: typeof AuthenticatedTripsRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/settings': {
      id: '/_authenticated/settings'
      path: '/settings'
      fullPath: '/settings'
      preLoaderRoute: typeof AuthenticatedSettingsRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/notifications': {
      id: '/_authenticated/notifications'
      path: '/notifications'
      fullPath: '/notifications'
      preLoaderRoute: typeof AuthenticatedNotificationsRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/maintenance': {
      id: '/_authenticated/maintenance'
      path: '/maintenance'
      fullPath: '/maintenance'
      preLoaderRoute: typeof AuthenticatedMaintenanceRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/live-operations': {
      id: '/_authenticated/live-operations'
      path: '/live-operations'
      fullPath: '/live-operations'
      preLoaderRoute: typeof AuthenticatedLiveOperationsRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/fuel-expenses': {
      id: '/_authenticated/fuel-expenses'
      path: '/fuel-expenses'
      fullPath: '/fuel-expenses'
      preLoaderRoute: typeof AuthenticatedFuelExpensesRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/fleet': {
      id: '/_authenticated/fleet'
      path: '/fleet'
      fullPath: '/fleet'
      preLoaderRoute: typeof AuthenticatedFleetRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/drivers': {
      id: '/_authenticated/drivers'
      path: '/drivers'
      fullPath: '/drivers'
      preLoaderRoute: typeof AuthenticatedDriversRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/dashboard': {
      id: '/_authenticated/dashboard'
      path: '/dashboard'
      fullPath: '/dashboard'
      preLoaderRoute: typeof AuthenticatedDashboardRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/analytics': {
      id: '/_authenticated/analytics'
      path: '/analytics'
      fullPath: '/analytics'
      preLoaderRoute: typeof AuthenticatedAnalyticsRouteImport
      parentRoute: typeof AuthenticatedRoute
    }
    '/_authenticated/trips/new': {
      id: '/_authenticated/trips/new'
      path: '/new'
      fullPath: '/trips/new'
      preLoaderRoute: typeof AuthenticatedTripsNewRouteImport
      parentRoute: typeof AuthenticatedTripsRoute
    }
    '/_authenticated/trips/$tripId': {
      id: '/_authenticated/trips/$tripId'
      path: '/$tripId'
      fullPath: '/trips/$tripId'
      preLoaderRoute: typeof AuthenticatedTripsTripIdRouteImport
      parentRoute: typeof AuthenticatedTripsRoute
    }
    '/_authenticated/maintenance/new': {
      id: '/_authenticated/maintenance/new'
      path: '/new'
      fullPath: '/maintenance/new'
      preLoaderRoute: typeof AuthenticatedMaintenanceNewRouteImport
      parentRoute: typeof AuthenticatedMaintenanceRoute
    }
    '/_authenticated/maintenance/$maintenanceId': {
      id: '/_authenticated/maintenance/$maintenanceId'
      path: '/$maintenanceId'
      fullPath: '/maintenance/$maintenanceId'
      preLoaderRoute: typeof AuthenticatedMaintenanceMaintenanceIdRouteImport
      parentRoute: typeof AuthenticatedMaintenanceRoute
    }
    '/_authenticated/fleet/new': {
      id: '/_authenticated/fleet/new'
      path: '/new'
      fullPath: '/fleet/new'
      preLoaderRoute: typeof AuthenticatedFleetNewRouteImport
      parentRoute: typeof AuthenticatedFleetRoute
    }
    '/_authenticated/fleet/$vehicleId': {
      id: '/_authenticated/fleet/$vehicleId'
      path: '/$vehicleId'
      fullPath: '/fleet/$vehicleId'
      preLoaderRoute: typeof AuthenticatedFleetVehicleIdRouteImport
      parentRoute: typeof AuthenticatedFleetRoute
    }
    '/_authenticated/drivers/new': {
      id: '/_authenticated/drivers/new'
      path: '/new'
      fullPath: '/drivers/new'
      preLoaderRoute: typeof AuthenticatedDriversNewRouteImport
      parentRoute: typeof AuthenticatedDriversRoute
    }
    '/_authenticated/drivers/$driverId': {
      id: '/_authenticated/drivers/$driverId'
      path: '/$driverId'
      fullPath: '/drivers/$driverId'
      preLoaderRoute: typeof AuthenticatedDriversDriverIdRouteImport
      parentRoute: typeof AuthenticatedDriversRoute
    }
    '/_authenticated/fleet/$vehicleId/edit': {
      id: '/_authenticated/fleet/$vehicleId/edit'
      path: '/edit'
      fullPath: '/fleet/$vehicleId/edit'
      preLoaderRoute: typeof AuthenticatedFleetVehicleIdEditRouteImport
      parentRoute: typeof AuthenticatedFleetVehicleIdRoute
    }
    '/_authenticated/drivers/$driverId/edit': {
      id: '/_authenticated/drivers/$driverId/edit'
      path: '/edit'
      fullPath: '/drivers/$driverId/edit'
      preLoaderRoute: typeof AuthenticatedDriversDriverIdEditRouteImport
      parentRoute: typeof AuthenticatedDriversDriverIdRoute
    }
  }
}

interface AuthenticatedDriversDriverIdRouteChildren {
  AuthenticatedDriversDriverIdEditRoute: typeof AuthenticatedDriversDriverIdEditRoute
}

const AuthenticatedDriversDriverIdRouteChildren: AuthenticatedDriversDriverIdRouteChildren =
  {
    AuthenticatedDriversDriverIdEditRoute:
      AuthenticatedDriversDriverIdEditRoute,
  }

const AuthenticatedDriversDriverIdRouteWithChildren =
  AuthenticatedDriversDriverIdRoute._addFileChildren(
    AuthenticatedDriversDriverIdRouteChildren,
  )

interface AuthenticatedDriversRouteChildren {
  AuthenticatedDriversDriverIdRoute: typeof AuthenticatedDriversDriverIdRouteWithChildren
  AuthenticatedDriversNewRoute: typeof AuthenticatedDriversNewRoute
}

const AuthenticatedDriversRouteChildren: AuthenticatedDriversRouteChildren = {
  AuthenticatedDriversDriverIdRoute:
    AuthenticatedDriversDriverIdRouteWithChildren,
  AuthenticatedDriversNewRoute: AuthenticatedDriversNewRoute,
}

const AuthenticatedDriversRouteWithChildren =
  AuthenticatedDriversRoute._addFileChildren(AuthenticatedDriversRouteChildren)

interface AuthenticatedFleetVehicleIdRouteChildren {
  AuthenticatedFleetVehicleIdEditRoute: typeof AuthenticatedFleetVehicleIdEditRoute
}

const AuthenticatedFleetVehicleIdRouteChildren: AuthenticatedFleetVehicleIdRouteChildren =
  {
    AuthenticatedFleetVehicleIdEditRoute: AuthenticatedFleetVehicleIdEditRoute,
  }

const AuthenticatedFleetVehicleIdRouteWithChildren =
  AuthenticatedFleetVehicleIdRoute._addFileChildren(
    AuthenticatedFleetVehicleIdRouteChildren,
  )

interface AuthenticatedFleetRouteChildren {
  AuthenticatedFleetVehicleIdRoute: typeof AuthenticatedFleetVehicleIdRouteWithChildren
  AuthenticatedFleetNewRoute: typeof AuthenticatedFleetNewRoute
}

const AuthenticatedFleetRouteChildren: AuthenticatedFleetRouteChildren = {
  AuthenticatedFleetVehicleIdRoute:
    AuthenticatedFleetVehicleIdRouteWithChildren,
  AuthenticatedFleetNewRoute: AuthenticatedFleetNewRoute,
}

const AuthenticatedFleetRouteWithChildren =
  AuthenticatedFleetRoute._addFileChildren(AuthenticatedFleetRouteChildren)

interface AuthenticatedMaintenanceRouteChildren {
  AuthenticatedMaintenanceMaintenanceIdRoute: typeof AuthenticatedMaintenanceMaintenanceIdRoute
  AuthenticatedMaintenanceNewRoute: typeof AuthenticatedMaintenanceNewRoute
}

const AuthenticatedMaintenanceRouteChildren: AuthenticatedMaintenanceRouteChildren =
  {
    AuthenticatedMaintenanceMaintenanceIdRoute:
      AuthenticatedMaintenanceMaintenanceIdRoute,
    AuthenticatedMaintenanceNewRoute: AuthenticatedMaintenanceNewRoute,
  }

const AuthenticatedMaintenanceRouteWithChildren =
  AuthenticatedMaintenanceRoute._addFileChildren(
    AuthenticatedMaintenanceRouteChildren,
  )

interface AuthenticatedTripsRouteChildren {
  AuthenticatedTripsTripIdRoute: typeof AuthenticatedTripsTripIdRoute
  AuthenticatedTripsNewRoute: typeof AuthenticatedTripsNewRoute
}

const AuthenticatedTripsRouteChildren: AuthenticatedTripsRouteChildren = {
  AuthenticatedTripsTripIdRoute: AuthenticatedTripsTripIdRoute,
  AuthenticatedTripsNewRoute: AuthenticatedTripsNewRoute,
}

const AuthenticatedTripsRouteWithChildren =
  AuthenticatedTripsRoute._addFileChildren(AuthenticatedTripsRouteChildren)

interface AuthenticatedRouteChildren {
  AuthenticatedAnalyticsRoute: typeof AuthenticatedAnalyticsRoute
  AuthenticatedDashboardRoute: typeof AuthenticatedDashboardRoute
  AuthenticatedDriversRoute: typeof AuthenticatedDriversRouteWithChildren
  AuthenticatedFleetRoute: typeof AuthenticatedFleetRouteWithChildren
  AuthenticatedFuelExpensesRoute: typeof AuthenticatedFuelExpensesRoute
  AuthenticatedLiveOperationsRoute: typeof AuthenticatedLiveOperationsRoute
  AuthenticatedMaintenanceRoute: typeof AuthenticatedMaintenanceRouteWithChildren
  AuthenticatedNotificationsRoute: typeof AuthenticatedNotificationsRoute
  AuthenticatedSettingsRoute: typeof AuthenticatedSettingsRoute
  AuthenticatedTripsRoute: typeof AuthenticatedTripsRouteWithChildren
}

const AuthenticatedRouteChildren: AuthenticatedRouteChildren = {
  AuthenticatedAnalyticsRoute: AuthenticatedAnalyticsRoute,
  AuthenticatedDashboardRoute: AuthenticatedDashboardRoute,
  AuthenticatedDriversRoute: AuthenticatedDriversRouteWithChildren,
  AuthenticatedFleetRoute: AuthenticatedFleetRouteWithChildren,
  AuthenticatedFuelExpensesRoute: AuthenticatedFuelExpensesRoute,
  AuthenticatedLiveOperationsRoute: AuthenticatedLiveOperationsRoute,
  AuthenticatedMaintenanceRoute: AuthenticatedMaintenanceRouteWithChildren,
  AuthenticatedNotificationsRoute: AuthenticatedNotificationsRoute,
  AuthenticatedSettingsRoute: AuthenticatedSettingsRoute,
  AuthenticatedTripsRoute: AuthenticatedTripsRouteWithChildren,
}

const AuthenticatedRouteWithChildren = AuthenticatedRoute._addFileChildren(
  AuthenticatedRouteChildren,
)

const rootRouteChildren: RootRouteChildren = {
  IndexRoute: IndexRoute,
  AuthenticatedRoute: AuthenticatedRouteWithChildren,
  AccessDeniedRoute: AccessDeniedRoute,
  ForgotPasswordRoute: ForgotPasswordRoute,
  LoginRoute: LoginRoute,
  ResetPasswordRoute: ResetPasswordRoute,
}
export const routeTree = rootRouteImport
  ._addFileChildren(rootRouteChildren)
  ._addFileTypes<FileRouteTypes>()

import type { getRouter } from './router.tsx'
import type { startInstance } from './start.ts'
declare module '@tanstack/react-start' {
  interface Register {
    ssr: true
    router: Awaited<ReturnType<typeof getRouter>>
    config: Awaited<ReturnType<typeof startInstance.getOptions>>
  }
}
