export const presetCatalog = {
  strict: {
    rules: {
      AWG001: 'critical',
      AWG002: 'critical',
      AWG004: 'critical',
      AWG005: 'critical',
      AWG006: 'critical',
      AWG008: 'high',
      AWG010: 'medium',
      AWG013: 'critical'
    },
    suppressions: {
      minimumReasonLength: 25
    }
  },
  'claude-code': {
    rules: {
      AWG001: 'critical',
      AWG006: 'critical',
      AWG013: 'high'
    },
    suppressions: {
      allowedRules: ['AWG001', 'AWG002', 'AWG008'],
      minimumReasonLength: 20
    }
  },
  codex: {
    rules: {
      AWG001: 'critical',
      AWG002: 'critical',
      AWG006: 'high',
      AWG013: 'high'
    },
    suppressions: {
      allowedRules: ['AWG001', 'AWG002', 'AWG008'],
      minimumReasonLength: 20
    }
  },
  aider: {
    rules: {
      AWG001: 'high',
      AWG004: 'critical',
      AWG005: 'critical'
    },
    suppressions: {
      minimumReasonLength: 15
    }
  },
  'triage-bot': {
    rules: {
      AWG001: 'critical',
      AWG004: 'critical',
      AWG005: 'critical',
      AWG006: 'critical'
    },
    suppressions: {
      allowedRules: ['AWG001', 'AWG002'],
      minimumReasonLength: 30
    }
  }
};

export function getPreset(name) {
  return presetCatalog[name];
}

export function listPresetNames() {
  return Object.keys(presetCatalog);
}
