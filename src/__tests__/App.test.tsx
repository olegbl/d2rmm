import '@testing-library/jest-dom';
import App from '../renderer/react/App';
import { render } from '@testing-library/react';

describe('App', () => {
  it('should render', () => {
    expect(render(<App />)).toBeTruthy();
  });
});
