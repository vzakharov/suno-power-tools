export const colonyCss = `
.colony { 
  font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif;
}

.colony button {
  background-color: #444;
  color: #eee
}

.colony #sidebar {
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

.colony .f-row {
  display: flex;
  flex-direction: row;
}

.colony .f-col {
  display: flex;
  flex-direction: column;
}

.colony .smol {
  font-size: 0.8em;
  color: #aaa;
}

.colony .relative {
  position: relative;
}

.colony .absolute {
  position: absolute;
}

.colony .topleft {
  top: 0;
  left: 0;
}

.colony .p-1 {
  padding: 1rem;
};

.colony .p-2 {
  padding: 2rem;
}

.colony .w-100 {
  width: 100%;
}

.colony .h-100 {
  height: 100%;
}

.colony .j-between {
  justify-content: space-between;
}

.colony .settings > div {
  margin-top: 5px;
}
`;