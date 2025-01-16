import { type default as ForceGraph } from 'force-graph';
import { Colony, ColonyGraphData, ColonyLink, ColonyNode, LinkKind } from "../../scripts/colony";
import { ref } from '../../smork/refs';
import { a, audio, button, Checkbox, div, h3, SmorkNode, img, importScript, Labeled, p, style, StyleOptions, TextInput, renderIf } from '../../smork/dom';
import { jsonClone, sortByDate, Undefined } from '../../utils';
import { colonyCss } from './css';

export async function render(
  ctx: Colony,
  rawData: ColonyGraphData, {
    mode = Undefined<'3D' | '3d'>(),
  }
) {

  const in3D = mode?.toLowerCase() === '3d';
  const hideUI = ref(false);
  const showUI = hideUI.map(hide => !hide);

  let graphContainer: HTMLDivElement;

  const useNextLinks = ref(true);
  const showNextLinks = ref(false);
  const useDescendantLinks = ref(true);
  const filterString = ref('');

  let audioContainer: HTMLDivElement;
  let audioLink: HTMLAnchorElement;
  let audioImage: HTMLImageElement;
  let audioName: HTMLDivElement;
  let audioTags: HTMLDivElement;
  let audioElement: HTMLAudioElement;

  const GraphRenderer: typeof ForceGraph = await importScript(window, 'ForceGraph', `https://unpkg.com/${in3D ? '3d-' : ''}force-graph`);
  window.document.head.appendChild(style([colonyCss]));

  type ProcessedLink = Omit<ColonyLink, 'source' | 'target'> & {
    source: string | ColonyNode;
    target: string | ColonyNode;
  }; //! because ForceGraph mutates links by including source and target nodes instead of their IDs

  const graphData = jsonClone(rawData); //! again, because ForceGraph mutates the data
  let graph = createGraph();
  function createGraph(): ForceGraph<ColonyNode, ProcessedLink> {
    const graph = new GraphRenderer<ColonyNode, ProcessedLink>(
      graphContainer
    )
      .graphData(graphData)
      .backgroundColor('#001')
      .linkAutoColorBy('kind')
      .nodeAutoColorBy('rootId')
      .linkLabel('kind')
      .linkVisibility(visibilityChecker)
      .linkDirectionalParticles(1)
      .nodeLabel(({ id, name, tags, image_url }) => `
        <div class="relative" style="width: 200px;">
          <img src="${image_url}" style="opacity: 0.5; width: 200px">
          <div class="absolute topleft" style="width: 190px; padding: 5px;">
            <div>${name || '[Untitled]'}</div>
            <div class="smol">${tags || '(no style)'}</div>
          </div>
        </div>
        <div class="smol">
          Click to play, right-click to open in Suno
        </div>
      `)
      .onNodeClick(({ id, name, tags, image_url, audio_url }) => {
        audioContainer.style.display = 'block';
        audioLink.href = `https://suno.com/song/${id}`;
        audioImage.src = image_url;
        audioName.innerText = name || '[Untitled]';
        audioTags.innerText = tags || '(no style)';
        audioElement.src = audio_url;
        audioElement.play();
      })
      .onNodeRightClick(({ id }) => {
        window.open(`https://suno.com/song/${id}`);
      });
    if ( in3D ) {
      // @ts-expect-error
      graph.linkOpacity(l => l.isMain ? 1 : 0.2)
      // TODO: Implement type-safe access to 3D-specific methods
    } else {
      graph.linkLineDash(l => l.isMain ? null : [1, 2])
    };
    return graph;
  };

  async function redrawGraph() {
    new FinalizationRegistry(() => console.log('Previous graph destroyed, container removed from memory')).register(graph, '');
    graph._destructor();
    container.remove();
    await render(this, rawData, { mode });
  };

  const data = graph.graphData();

  function visibilityChecker(link: ProcessedLink) {
    return !{
      descendant: true,
      next: !showNextLinks.value,
    }[link.kind];
  };

  // function applyLinkFilter(kind: LinkKind, checkbox: HTMLInputElement) {
  function applyLinkFilter(kind: LinkKind, useLinks: boolean | undefined) {
    let { nodes, links } = graph.graphData();
    if ( !useLinks ) {
      links = links.filter(l => l.kind !== kind);
    } else {
      links.push(...data.links.filter(l => l.kind === kind));
    }
    if ( kind === 'next' ) {
      // showNextLinksContainer.style.display = checkbox.checked ? 'block' : 'none';
      // Remove 'next' links, just in case they're already there
      links = links.filter(l => l.kind !== 'next');
      if ( useLinks ) {
        // Add 'next' links dynamically by going from the oldest to the newest node
        sortByDate(nodes);
        for ( let i = 1; i < nodes.length; i++ ) {
          const source = nodes[i - 1];
          const target = nodes[i];
          links.push({
            source: source.id,
            target: target.id,
            kind: 'next',
            color: '#006',
            isMain: false
          });
        };
      }
    };
    graph.graphData({ nodes, links });
  };

  useNextLinks.watchImmediate(useLinks => applyLinkFilter('next', useLinks));
  useDescendantLinks.watchImmediate(useLinks => applyLinkFilter('descendant', useLinks));

  showNextLinks.watchImmediate(() => {
    graph.linkVisibility(visibilityChecker);
  });

  type NodeOrId = string | ColonyNode;
  function id(node: NodeOrId) {
    return typeof node === 'string' ? node : node.id;
  };
  function sameId(node1: NodeOrId, node2: NodeOrId) {
    return id(node1) === id(node2);
  };
  function sameIdAs(original: NodeOrId) {
    return (candidate: NodeOrId) => sameId(original, candidate);
  };

  filterString.watchImmediate(filter => {
    filter = filter?.toLowerCase();
    const matchingNodes = filter 
      ? data.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))
      : data.nodes;
    const existing = graph.graphData();
    const nodes = [
      ...matchingNodes.map(node => existing.nodes.find(sameIdAs(node)) ?? node),
      ...filter 
        ? data.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))
        : []
    ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);
    const links = data.links
      .filter(link => nodes.some(sameIdAs(link.source)) && nodes.some(sameIdAs(link.target)))
      .map(({ source, target, ...rest }) => ({ source: id(source), target: id(target), ...rest }))
      .map(link => existing.links.find(l => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link);
    graph.graphData({ nodes, links });
    if ( filter )
      graph.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);
    else
      graph.nodeVal('val');
  });

  setTimeout(() => {
    useNextLinks.set(false);
    useDescendantLinks.set(false);
  }, 2000);
  //! (We need to start with using time-based/root forces for a more interesting initial layout, but we want to release them then because they kinda look bad)
  
  const container = document.body.appendChild(div(
    {
      class: 'colony',
      style: {
        position: 'fixed',
        top: '0px',
        left: '0px',
        zIndex: '100',
      }
    }, [
      renderIf(showUI,
        div({
          style: { flexDirection: 'column', height: '100vh', width: '100vh', backgroundColor: '#000', },
        }, [
          graphContainer = div(),
          div({ 
            id: 'sidebar',
          }, [  
            div({
              class: 'settings f-col'
            }, [
              button({ 
                style: { marginBottom: '5px'},
              // }, {
                onclick: () => hideUI.set(true)
              }, [
                'Close Colony'
              ]),
              h3(['Settings']),
              div(
                Labeled('Attract based on time',
                  Checkbox(useNextLinks)
                )
              ),
              div({
                // style: displayNoneUnless(useNextLinks),
                style: useNextLinks.map<StyleOptions>(useLinks => ({
                  display: useLinks ? 'block' : 'none'
                }))
              },
                Labeled('Show time-based links',
                  Checkbox(showNextLinks)
                )
              ),
              div(
                Labeled('Attract to root clip',
                  Checkbox(useDescendantLinks)
                )
              ),
              div([
                TextInput(filterString, { placeholder: 'Filter by name, style or ID' }),
                p({ class: 'smol' }, [
                  'Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)'
                ])
              ]),
              button({/*}, {*/ onclick: redrawGraph }, [
                'Redraw'
              ]),
              button({/*}, {*/ onclick: () => ctx.renderToFile(mode) }, [
                'Download'
              ])
            ]),
            audioContainer = div({ class: 'w-100', style: { display: 'none' } }, [
              div({ class: 'relative' }, [
                audioLink = a({ target: '_blank' }, [
                  audioImage = img({ style: 'opacity: 0.5', class: 'w-100' })
                ]),
                div({ class: 'absolute topleft', style: 'width: 190px; padding: 5px;' }, [
                  audioName = div(),
                  audioTags = div({ class: 'smol' })
                ])
              ]),
              audioElement = audio({ controls: true, class: 'w-100' })
            ])
          ])
        ]),
        button({ 
          style: { position: 'fixed', top: '0px', left: '0px', padding: '5px', zIndex: '100', },
        // }, {
          onclick: () => hideUI.set(false)
        }, [
          'Reopen Colony'
        ])
      )
    ]
  ));


};