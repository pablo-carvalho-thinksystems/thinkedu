// Current build uses local reminders only. Remote pushes require a paid Apple
// Developer team and a separate server delivery integration before activation.
const { withEntitlementsPlist } = require('expo/config-plugins');
module.exports = config => withEntitlementsPlist(config, config => {
  delete config.modResults['aps-environment'];
  return config;
});
