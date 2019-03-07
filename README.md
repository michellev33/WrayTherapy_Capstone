# JetLag: 2D Games for Web and Mobile -- StackBlitz Branch

JetLag is a framework for making 2D games that run in desktop and mobile
browsers.  This branch is specifically for using JetLag from StackBlitz.

As of March 6, 2019, there are three main differences between this branch and
master:

* JetLag uses a newer version of box2d, instead of PhysicsType2d.
  JetLag-StackBlitz needs to keep using PhysicsType2d, and in a very ugly and
  hack-ish way, in order to have a physics engine that is able to be loaded by
  the module loader in StackBlitz.

* JetLag-StackBlitz does not have some of the tooling (webpack.config.json,
  tsconfig.json, etc) that JetLag has, since that tooling is provided by
  StackBlitz.

* JetLag-StackBlitz does not have an assets folder, since StackBlitz does not
  support static assets yet.

If you are interested in using JetLag in any environment other than StackBlitz,
it is highly recommended that you focus on the code in the master branch.