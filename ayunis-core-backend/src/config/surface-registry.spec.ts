import { featuresConfig } from 'src/config/features.config';
import {
  getTokenSurfaceScopes,
  isTokenSurfaceEnabled,
  SURFACE_REGISTRY,
  type TokenSurfaceId,
} from 'src/config/surface-registry';
import { SurfaceScope } from 'src/config/surface-scope';

const excel = 'excel' as TokenSurfaceId;

function featureState(excelAddinEnabled: boolean) {
  return { ...featuresConfig(), excelAddinEnabled };
}

describe('Excel surface access', () => {
  it('allows only shared session cleanup when Excel is disabled', () => {
    const features = featureState(false);

    expect(isTokenSurfaceEnabled(excel, features)).toBe(false);
    expect(getTokenSurfaceScopes(excel, features)).toEqual([
      SurfaceScope.SESSION,
    ]);
  });

  it('allows the declared Excel scopes when Excel is enabled', () => {
    const features = featureState(true);

    expect(isTokenSurfaceEnabled(excel, features)).toBe(true);
    expect(getTokenSurfaceScopes(excel, features)).toEqual([
      SurfaceScope.ACADEMY_READ,
      SurfaceScope.CHAT,
      SurfaceScope.CHAT_SETTINGS_READ,
      SurfaceScope.MODELS_READ,
      SurfaceScope.SESSION,
      SurfaceScope.UPLOADS,
      SurfaceScope.VOICE,
    ]);
    expect(SURFACE_REGISTRY.excel.clientTools).toEqual([]);
    expect(SURFACE_REGISTRY.excel.manifest).toEqual({
      route: 'excel/manifest.xml',
      taskPane: 'taskpane.html',
    });
  });

  it('shares Outlook chat context without Outlook-specific mail tools', () => {
    expect(SURFACE_REGISTRY.excel.run.capabilities).toEqual(
      SURFACE_REGISTRY.outlook.run.capabilities.filter(
        (capability) => capability !== 'outlookAddIn',
      ),
    );
  });

  it.each([false, true])(
    'keeps Outlook enabled when Excel enabled is %s',
    (excelAddinEnabled) => {
      const features = featureState(excelAddinEnabled);

      expect(isTokenSurfaceEnabled('outlook', features)).toBe(true);
      expect(getTokenSurfaceScopes('outlook', features)).toContain(
        SurfaceScope.CHAT,
      );
    },
  );
});
