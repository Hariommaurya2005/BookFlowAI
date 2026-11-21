const isAuthVersionCurrent = (tokenVersion, userVersion) =>
  Number(tokenVersion || 0) === Number(userVersion || 0);

module.exports = { isAuthVersionCurrent };
