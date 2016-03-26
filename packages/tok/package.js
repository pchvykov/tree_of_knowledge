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
  api.use(['ecmascript']);
  api.use(['d3',
          'templating',
          'twbs:bootstrap', 
          'peppelg:bootstrap-3-modal'],'client');

  api.addFiles('dbServer.js'); //load both on client and server
  api.addFiles(['tok.css',
              'tok.js',
              'gui.js',
              'templates/popup-modals.html',
              'templates/popup-modals.js'], 'client');
  
  api.export('treeData');
  api.export('ToK','client');
});

Package.onTest(function(api) {
  api.use('ecmascript');
  api.use('tinytest');
  api.use('pchvykov:tok');
  api.addFiles('tok-tests.js');
});
