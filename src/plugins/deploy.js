
/* REQUIRE */

const _ = require ( 'lodash' ),
      chalk = require ( 'chalk' ),
      copy = require ( 'recursive-copy' ),
      del = require ( 'del' ),
      fs = require ( 'fs' ),
      os = require ( 'os' ),
      path = require ( 'path' ),
      pify = require ( 'pify' ),
      simpleGit = require ( 'simple-git' );

/* UTILITIES */

function getGit ( repo ) {

  return pify ( _.bindAll ( simpleGit ( repo ), ['add', 'branchLocal', 'checkIsRepo', 'checkout', 'commit', 'getRemotes', 'push'] ) );

}

async function checkIsRepo ( git ) {

  if ( await git.checkIsRepo () ) return;

  throw new Error ( `"${chalk.underline ( git._baseDir )}" is not a git repository` );

}

async function getRemote ( config, git, branch ) {

  const remotes = await git.getRemotes ();

  if ( !remotes.length ) return;

  const names = remotes.map ( remote => remote.name ),
        remote = names.includes ( config.remote ) ? config.remote : names[0];

  return remote;

}

async function getBranches ( config, git ) {

  const {current, all} = await git.branchLocal (),
        branch = config.branches.find ( branch => all.includes ( branch ) );

  if ( !branch ) throw new Error ( `Deploy branch not found, support branches: ${all.map ( branch => `"${chalk.underline ( branch )}"` ).join ( ', ' )}`)

  if ( branch === current ) throw new Error ( `Can't deploy to the current checked-out branch: "${chalk.underline ( branch )}"` );

  return [current, branch];

}

async function isPath ( filepath ) {

  try {

    fs.accessSync ( filepath );

    return true;

  } catch ( e ) {

    return false;

  }

}

async function checkPath ( filepath ) {

  if ( await isPath ( filepath ) ) return;

  throw new Error ( `Path not found: "${chalk.underline ( filepath )}"` );

}

async function copyPath ( config, src, dist ) {

  const options = {
    overwrite: true,
    dot: true,
    filter: config.globs
  };

  return copy ( src, dist, options );

}

async function deployPath ( config, git, srcPath, srcBranch, distPath, distBranch ) {

  const tempPath = path.join ( os.homedir (), `.statico-deploy-temp-${_.random ( 0, 1000000 )}` );

  await copyPath ( config, srcPath, tempPath );

  await git.checkout ( distBranch );

  await del ( config.globs, { cwd: distPath, force: true } );

  await copyPath ( config, tempPath, distPath );

  await git.add ( './*' );
  await git.commit ( config.commit );

  const remote = await getRemote ( config, git, distBranch );
  if ( remote ) {
    await git.push ( remote, distBranch );
  }

  await git.checkout ( srcBranch );

  if ( !await isPath ( srcPath ) ) { // This path is probably inside master's `.gitignore`, so it probably got deleted, we should restore it
    await copyPath ( config, tempPath, srcPath );
  }

  await del ( tempPath, { force: true } );

}

/* DEPLOY */

async function deploy ( config ) {

  /* CONFIG */

  config = _.merge ({
    repo: process.cwd (),
    website: process.cwd (),
    remote: 'origin', // Preferred remote repository
    branches: ['gh-pages', 'master'], // Preferred dist branch
    commit: 'Deploy', // Commit message
    globs: ['**/*', '!.git'] // Globs used when copying/moving files around
  }, config );

  /* DEPLOY */

  await checkPath ( config.website );

  const git = getGit ( config.repo );

  await checkIsRepo ( git );

  const [current, target] = await getBranches ( config, git );

  await deployPath ( config, git, config.website, current, config.repo, target );

}

/* EXPORT */

module.exports = deploy;
