#!/usr/bin/env node
var Vorpal = require('vorpal');
var chalk = Vorpal().chalk;
var exec = require('child_process').exec
var fs = require('fs');

var botkit = Vorpal()

var platforms = ['web', 'teams', 'spark', 'slack', 'facebook'];
var platform_src = [
  {
    platform: 'web',
    artifact: 'https://github.com/howdyai/botkit-starter-web.git',
    directory: 'botkit-starter-web'
  },
  {
    platform: 'teams',
    artifact: 'https://github.com/howdyai/botkit-starter-teams.git',
    directory: 'botkit-starter-teams'
  },
  {
    platform: 'spark',
    artifact: 'https://github.com/howdyai/botkit-starter-ciscospark.git',
    directory: 'botkit-starter-ciscospark'
  },
  {
    platform: 'slack',
    artifact: 'https://github.com/howdyai/botkit-starter-slack.git',
    directory: 'botkit-starter-slack'
  },
  {
    platform: 'facebook',
    artifact: 'https://github.com/howdyai/botkit-starter-facebook.git',
    directory: 'botkit-starter-facebook'
  }
];

var bot_vars;
``
function askBotName(i){
  return new Promise(function(resolve, reject){
    var self = i;
    if (bot_vars.name) {
      resolve(bot_vars.name);
    } else {
      self.prompt({
        type: 'input',
        name: 'name',
        message: 'What would you like to name your bot? '
      }, function(result){
        if(result.name){
          bot_vars.name = result.name;
          // self.log(`Your bot shall be called ${result.name} bask in all of its glory!`);
          resolve(result.name);
        }else {
          reject({});
        }
      });
    }
  });
}


function askBotPlatform(i){
  return new Promise(function(resolve, reject){
    var self = i;
    if (bot_vars.platform) {
      resolve(bot_vars.platform);
    } else {
      self.prompt({
        type: 'list',
        choices: platforms,
        name: 'platform',
        message: 'What platform will this bot live on? '
      }, function(result){
        if(result.platform){
          bot_vars.platform = result.platform;
          resolve(bot_vars.platform);
        }else {
          reject({});
        }
      });
    }
  });
}


function askStudioKey(i){
  return new Promise(function(resolve, reject){
    var self = i;
    if (bot_vars.studio_token) {
      resolve(bot_vars.studio_token);
    } else {
        self.prompt({
          type: 'input',
          name: 'studio_token',
          message: '(Optional) Please enter your Botkit Studio token. Get one from https://studio.botkit.ai '
        }, function(result){
          if(result.studio_token){
            bot_vars.studio_token = result.studio_token;
            resolve(bot_vars.studio_token);
          }else {
            resolve();
          }
        });
      }
  });
}


function getBotInput(self, bot_vars){
  return new Promise(function(resolve, reject){
    askBotName(self).then(function(name) {
      self.log(`Your bot shall be called ${name} bask in all of its glory!`);
      askBotPlatform(self).then(function(platform) {
         self.log(`We will build for the ${platform} platform!`);
        askStudioKey(self).then(function(key) {
          if (key) {
            self.log(`Botkit Studio APIs enabled!`);
          } else {
            self.log(`Your bot will not use Botkit Studio.`);
          }
          resolve(bot_vars);
        }).catch(reject);
      }).catch(reject);
    }).catch(reject);
  });
}

function buildBotKit(i, bot_vars, cb){
  var self = i;
  if(fs.existsSync(bot_vars.name)){
    self.log('A bot called ' + bot_vars.name + ' already exist in this directory. Please try again with a different name.');
    cb();
  }else {
    self.log('Installing Botkit...')
    var target = platform_src.filter(function(p){
      return p.platform === bot_vars.platform;
    });
    if(target.length > 0){
      var now = new Date();
      var temp_folder_name = String(now.getTime());
      var action = 'mkdir ' + temp_folder_name + ' && cd ' + temp_folder_name + ' && git clone ' + target[0].artifact;
      var npm_command = 'mv ' + temp_folder_name + '/' + target[0].directory + '/ ' + bot_vars.name  + ' && cd ' + bot_vars.name + ' && npm install && cd .. && rm -rf ' +  temp_folder_name;
      exec(action, function(err, stdout, stderr){
        if(err){
          // self.log('err', err);
          self.log('An error occured. You may already have that starter kit installed.');
          cb();
        }else {
          self.log('Installing dependencies...');
          exec(npm_command, function(err, stdout, stderr){
            if(err){
              // self.log('err: ', err);
              self.log('An error occured. You may already have that starter kit installed.');
              cb();
            }else {
              // self.log('bot_vars: ', bot_vars);
              if(bot_vars.studio_token){
                writeStudioToken(self, bot_vars, function(){
                  var final_msg = 'Installation complete. In your terminal please type "cd ' + bot_vars.name + ' && node ." to start your bot';
                  self.log(final_msg);
                  cb();
                });
              }else {
                var final_msg = 'Installation complete. In your terminal please type "cd ' + bot_vars.name + ' && node ." to start your bot';
                self.log(final_msg);
                cb();
              }
            }
          });
        }
      });
    }else {
      bot_vars.platform = null;
      self.log('Please try again with a valid platform.');
      cb();
    }
  }
}

function writeStudioToken(i, bot_vars, cb){
  var self = i;
  self.log('Writing Botkit Studio token...')
  var dotenvfile = bot_vars.name + '/.env'
  var line_replacement = 'studio_token=' + bot_vars.studio_token;
  fs.readFile(dotenvfile, 'utf8', function(err, data){
    if(err){
      self.log('An error occured: There was a problem reading ' + dotenvfile);
      cb();
    }else {
      var results = data.replace(/studio_token=/g, line_replacement);
      fs.writeFile(dotenvfile, results, 'utf8', function(err){
        if(err){
          self.log('An error occured: There was a problem writing ' + dotenvfile);
          cb();
        }else {
          self.log('Your Botkit Studio token has been written to ' + dotenvfile);
          cb();
        }
      });
    }
  })
}


botkit
  .command('new')
//  .option('-o, --object <obj>', 'What do you want to make? example: bot')
  .option('-n, --name [name]', 'Name of your Bot')
  .option('-p, --platform [platform]', 'Primary messaging platform')
  .option('-k, --studio_token [studio_token]', 'API token from Botkit Studio')
  .description('Configure a new Botkit-powered application')
  .action(function(args, cb){
    var self = this;
    // self.log('args: ', args)
    switch (args.obj) {
      default:
      case 'bot':
      bot_vars = {};
      if(args.options.name){
        bot_vars.name = args.options.name
      }
      if(args.options.platform){
        bot_vars.platform = args.options.platform;
      }
      if(args.options.studio_token){
        bot_vars.studio_token = args.options.studio_token
      }
      if(bot_vars.name && bot_vars.platform){
        // call the thing
        buildBotKit(self, bot_vars, cb);
        // cb();
      }else {
        getBotInput(self, bot_vars).then(function(res){
          // self.log('res: ', res);
          buildBotKit(self, bot_vars, cb);
        }).catch(function(err){
          // self.log('err: ', err);
          cb();
        });
      }
      break;
      // default:
      //   self.log('I do not understand!');
      //   cb();
    }
  });


botkit
.delimiter(chalk.magenta('botkit~$'))
.show()
.parse(process.argv)