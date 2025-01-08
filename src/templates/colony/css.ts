export const colonyCss = `
body { 
  margin: 0;
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

#sidebar {
  position: fixed;
  padding: 10px;
  top: 0;
  left: 0;
  bottom: 0;
  width: 200px;
  background-color: #333;
  color: #eee;
  display: flex;
  flex-direction: column;
  justify-content: space-between;
}

.f-row {
  display: flex;
  flex-direction: row;
}

.f-col {
  display: flex;
  flex-direction: column;
}

.smol {
  font-size: 0.8em;
  color: #aaa;
}

.relative {
  position: relative;
}

.absolute {
  position: absolute;
}

.topleft {
  top: 0;
  left: 0;
}

.p-1 {
  padding: 1rem;
};

.p-2 {
  padding: 2rem;
}

.w-100 {
  width: 100%;
}

.h-100 {
  height: 100%;
}

.j-between {
  justify-content: space-between;
}

.settings > div {
  margin-top: 5px;
}
`;