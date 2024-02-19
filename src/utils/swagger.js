import swaggerAutogen from 'swagger-autogen';

const doc = {
  info: {
    title: 'Youtwitt',
    description: 'Full backend of Youtube and twitter together',
  },
  host: 'localhost:8000'
};

const outputFile = '../../doc/swagger.json';
const routes = ['./src/app.js', './src/routes/user.routes.js', './src/routes/healthcheck.routes.js', './src/routes/tweet.routes.js', './src/routes/subscription.routes.js', './src/routes/video.routes.js', './src/routes/comment.routes.js', './src/routes/like.routes.js', './src/routes/playlist.routes.js', './src/routes/dashboard.routes.js'];


swaggerAutogen()(outputFile, routes, doc);