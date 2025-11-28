# React Frontend Bugbot Policy

- All data exchange to the backend must go through auto generated endpoints from orval
- Everything related to a page must live in the page's folder
- If something is used more than once and
  - it is a UI component: Move it to widgets
  - it is stateful functionality without UI: Move it to features as hook
  - it is stateless functionality withouth UI: Move it to lib
- Avoid unnecessary prop drilling. Components should be self contained where possible
