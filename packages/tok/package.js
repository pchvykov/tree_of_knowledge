Package.describe({
  name: 'pchvykov:tok',
  version: '0.0.1',
  // Brief, one-line summary of the package.
  summary: '',
  // URL to the Git repository containing the source code for this package.
  git: '',
  // By default, Meteor will default to using README.md for documentation.
  // To avoid submitting documentation, set this field to null.
  documentation: 'README.md'
});

Package.onUse(function(api) {
  api.versionsFrom('1.2.1');
  api.use(['ecmascript','d3']);

  api.addFiles('dbServer.js', 'server');
  api.addFiles(['tok.css','tok.js'], 'client');
  
  api.export('treeData','server');
  api.export('ToK','client');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('pchvykov:tok');
  api.addFiles('tok-tests.js');
});
