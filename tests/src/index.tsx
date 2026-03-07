import express from 'express';
import { HomePage } from '#components/home-page';
import { renderPageToString } from '#utils/render-page-to-string';

const port = 1234;
const app = express();

app.get('/', (req, res) => {
  res.send(renderPageToString(<HomePage />));
});

app.listen(port, () => {
  console.log(`Server started on http://localhost:${port}`);
});
