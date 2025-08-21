// ---------- настройки для webpack в режиме 'production': ----------
const CssMinimizerPlugin = require('css-minimizer-webpack-plugin');

module.exports = {
  mode: 'production', 
  optimization: {
    minimizer: [new CssMinimizerPlugin()], 
  },
};
