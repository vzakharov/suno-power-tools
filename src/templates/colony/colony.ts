import { default as ForceGraph } from 'force-graph';
import { Colony, ColonyGraphData, ColonyLink, ColonyNode, LinkKind } from "../../scripts/colony";
import { audio, button, Checkbox, div, h3, If, importScript, Labeled, p, style, TextInput } from '../../smork/dom';
import { assignTo, ref } from '../../smork/refs';
import { jsonClone, sortByDate, Undefined } from '../../utils';
import { ClipCard } from './ClipCard';
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

  const graphContainer = ref<HTMLDivElement>();
  graphContainer.onceDefined(createGraph);
  const graph = ref<ForceGraph<ColonyNode, ProcessedLink>>();
  const data = graph.map(graph => graph?.graphData());

  const useNextLinks = ref(true);
  const showNextLinks = ref(false);
  const useDescendantLinks = ref(true);
  const filterString = ref('');

  const audioElement = ref<HTMLAudioElement>();

  const selectedClip = ref<ColonyNode>();
  selectedClip.onChange(() => 
    setTimeout(() => { // we want to make sure the element is updated before we try to play it
      audioElement.value?.play();
    }, 0)
  );

  const GraphRenderer: typeof ForceGraph = await importScript(window, 'ForceGraph', `https://unpkg.com/${in3D ? '3d-' : ''}force-graph`);
  window.document.head.appendChild(style([colonyCss]));

  type ProcessedLink = Omit<ColonyLink, 'source' | 'target'> & {
    source: string | ColonyNode;
    target: string | ColonyNode;
  }; //! because ForceGraph mutates links by including source and target nodes instead of their IDs

  const graphData = jsonClone(rawData); //! again, because ForceGraph mutates the data

  function createGraph(graphContainer: HTMLDivElement) {
    graph.value = new GraphRenderer<ColonyNode, ProcessedLink>(graphContainer)
      .graphData(graphData)
      .backgroundColor('#001')
      .linkAutoColorBy('kind')
      .nodeAutoColorBy('rootId')
      .linkLabel('kind')
      .linkVisibility(visibilityChecker)
      .linkDirectionalParticles(1)
      .nodeLabel(clip => 
        div([
          ClipCard(clip),
          div({ class: 'smol' }, [
            'Click to play, right-click to open in Suno'
          ])
        ]).outerHTML
      )
      .onNodeClick(assignTo(selectedClip))
      .onNodeRightClick(({ id }) => {
        window.open(`https://suno.com/song/${id}`);
      });
    if ( in3D ) {
      // @ts-expect-error
      graph.value.linkOpacity(l => l.isMain ? 1 : 0.2)
      // TODO: Implement type-safe access to 3D-specific methods
    } else {
      graph.value.linkLineDash(l => l.isMain ? null : [1, 2])
    };
  };

  async function redrawGraph() {
    new FinalizationRegistry(() => console.log('Previous graph destroyed, container removed from memory')).register(graph, '');
    graph.value?._destructor();
    container.remove();
    await render(this, rawData, { mode });
  };

  function visibilityChecker(link: ProcessedLink) {
    return !{
      descendant: true,
      next: !showNextLinks.value,
    }[link.kind];
  };

  // function applyLinkFilter(kind: LinkKind, checkbox: HTMLInputElement) {
  function applyLinkFilter(kind: LinkKind, useLinks: boolean | undefined) {
    if ( !data.value || ! graph.value)
      return;
    let { nodes, links } = data.value;
    if ( !useLinks ) {
      links = links.filter(l => l.kind !== kind);
    } else {
      links.push(...data.value.links.filter(l => l.kind === kind));
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
    graph.value.graphData({ nodes, links });
  };

  useNextLinks.watchImmediate(useLinks => applyLinkFilter('next', useLinks));
  useDescendantLinks.watchImmediate(useLinks => applyLinkFilter('descendant', useLinks));

  showNextLinks.watchImmediate(() => {
    graph.value?.linkVisibility(visibilityChecker);
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
    if ( !data.value || !graph.value )
      return;
    filter = filter?.toLowerCase();
    const matchingNodes = filter 
      ? data.value.nodes.filter(node => `${node.id} ${node.name} ${node.tags} ${node.created_at}`.toLowerCase().includes(filter))
      : data.value.nodes;
    const existing = graph.value.graphData();
    const nodes = [
      ...matchingNodes.map(node => existing.nodes.find(sameIdAs(node)) ?? node),
      ...filter 
        ? data.value.nodes.filter(node => matchingNodes.some(n => n.rootId === node.rootId && n.id !== node.id))
        : []
    ].map(node => existing.nodes.find(n => n.id === node.id) ?? node);
    const links = data.value.links
      .filter(link => nodes.some(sameIdAs(link.source)) && nodes.some(sameIdAs(link.target)))
      .map(({ source, target, ...rest }) => ({ source: id(source), target: id(target), ...rest }))
      .map(link => existing.links.find(l => sameId(link.source, l.source) && sameId(link.target, l.target)) ?? link);
    graph.value.graphData({ nodes, links });
    if ( filter )
      graph.value.nodeVal(node => matchingNodes.some(n => n.id === node.id) ? 3 : node.val);
    else
      graph.value.nodeVal('val');
  });

  setTimeout(() => {
    useNextLinks.set(false);
    useDescendantLinks.set(false);
  }, 2000);
  //! (We need to start with using time-based/root forces for a more interesting initial layout, but we want to release them then because they kinda look bad)
  
  const container = document.body.appendChild(div({ 
      class: 'colony', style: { position: 'fixed', top: '0px', left: '0px', zIndex: '100',} 
    }, [
      If(showUI,
        div({ style: { flexDirection: 'column', height: '100vh', width: '100vh', backgroundColor: '#000', } }, [
          graphContainer.value = div(),
          div({ id: 'sidebar' }, [  
            div({ class: 'settings f-col' }, [
              button({ 
                style: { marginBottom: '5px'},
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
              If(useNextLinks, div(
                Labeled('Show time-based links',
                  Checkbox(showNextLinks)
                )
              )),
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
              button({ onclick: redrawGraph }, [
                'Redraw'
              ]),
              button({ onclick: () => ctx.renderToFile(mode) }, [
                'Download'
              ])
            ]),
            If(selectedClip, clip => {
              return div({ class: 'w-100' }, [
                ClipCard(clip),
                audioElement.value = audio({ src: clip.audio_url, controls: true, class: 'w-100' })
              ])
            })
          ])
        ]),
        button({ 
          style: { position: 'fixed', top: '0px', left: '0px', padding: '5px', zIndex: '100', },
          onclick: () => hideUI.set(false)
        }, [
          'Reopen Colony'
        ])
      )
    ]
  ));


};


