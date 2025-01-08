import { type GraphData, type default as ForceGraph } from 'force-graph';
import { a, assert, audio, body, button, checkbox, div, ensure, h3, head, html, img, importScript, labeled, p, ref, script, style, textInput } from "../../pork";
import { ColonyGraphData, ColonyLink, ColonyNode, LinkKind, SyntheticLink, SyntheticLinkKind } from "../../scripts/colony";
import { mapValues } from '../../lodashish';
import { $throw, $with } from '../../utils';
import { colonyCss } from './css';

export async function render(rawData: ColonyGraphData, {
  in3D = false,
  win = window
}) {

  const graphContainer = ref<HTMLDivElement>();

  const closeButton = ref<HTMLButtonElement>();

  const useNextLinksCheckbox = ref<HTMLInputElement>();
  const showNextLinksContainer = ref<HTMLDivElement>();
  const showNextLinksCheckbox = ref<HTMLInputElement>();
  const useDescendantLinksCheckbox = ref<HTMLInputElement>();
  const filterInput = ref<HTMLInputElement>();
  const audioRefs = {
    container: ref<HTMLDivElement>(),
    link: ref<HTMLAnchorElement>(),
    image: ref<HTMLImageElement>(),
    name: ref<HTMLDivElement>(),
    tags: ref<HTMLDivElement>(),
    audio: ref<HTMLAudioElement>()
  };

  const GraphRenderer: typeof ForceGraph = await importScript(win, 'ForceGraph', `https://unpkg.com/${in3D ? '3d-' : ''}force-graph`);
  win.document.head.appendChild(style([colonyCss]));
  
  const container = div(
    {
      style: {
        position: 'fixed',
        top: '0px',
        left: '0px',
        width: '100%',
        height: '100%',
        backgroundColor: '#000',
        zIndex: '100',
      }
    }, [
      div(graphContainer),
      div({ id: 'sidebar' }, [
        div({
          class: 'settings f-col'
        }, [
          button(closeButton, { style: { backgroundColor: '#444', color: '#eee', marginBottom: '5px'} }, [
            'Close Colony'
          ]),
          h3(['Settings']),
          div(
            labeled('Attract based on time',
              checkbox(useNextLinksCheckbox, { checked: true })
            )
          ),
          div(showNextLinksContainer, 
            labeled('Show time-based links',
              checkbox(showNextLinksCheckbox)
            )
          ),
          div(
            labeled('Attract to root clip',
              checkbox(useDescendantLinksCheckbox, { checked: true })
            )
          ),
          div([
            textInput(filterInput, { placeholder: 'Filter by name, style or ID' }),
            p({ class: 'smol' }, [
              'Enter to apply. (Filter will include both matching nodes and any nodes belonging to the same root clip.)'
            ])
          ])
        ]),
        div(audioRefs.container, { class: 'w-100', style: { display: 'none' } }, [
          div({ class: 'relative' }, [
            a(audioRefs.link, { target: '_blank' }, [
              img(audioRefs.image, { style: 'opacity: 0.5', class: 'w-100' })
            ]),
            div({ class: 'absolute topleft', style: 'width: 190px; padding: 5px;' }, [
              div(audioRefs.name),
              div(audioRefs.tags, { class: 'smol' })
            ])
          ]),
          audio(audioRefs.audio, { controls: true, class: 'w-100' })
        ])
      ])
    ]
  );

  const reopenButton = button({ style: { 
    position: 'fixed', top: '0px', left: '0px', padding: '5px', backgroundColor: '#444', color: '#eee', zIndex: '100'
  } }, [
    'Reopen Colony'
  ]);

  function showContainer() {
    win.document.body.appendChild(container);
    reopenButton.parentElement?.removeChild(reopenButton);
  };

  showContainer();

  ensure(closeButton).addEventListener('click', () => {
    win.document.body.removeChild(container);
    win.document.body.appendChild(reopenButton);
  });
  
  reopenButton.addEventListener('click', () => {
    showContainer();
  });

  type ProcessedLink = Omit<ColonyLink, 'source' | 'target'> & {
    source: string | ColonyNode;
    target: string | ColonyNode;
  }; //! because ForceGraph mutates links by including source and target nodes instead of their IDs

  const graph = new GraphRenderer<ColonyNode, ProcessedLink>(
    ensure(graphContainer)
  )
    .graphData(rawData)
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
      ensure(audioRefs.container).style.display = 'block';
      ensure(audioRefs.link).href = `https://suno.com/song/${id}`;
      ensure(audioRefs.image).src = image_url;
      ensure(audioRefs.name).innerText = name || '[Untitled]';
      ensure(audioRefs.tags).innerText = tags || '(no style)';
      const audio = ensure(audioRefs.audio);
      audio.src = audio_url;
      audio.play();
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

  const data = graph.graphData();

  function visibilityChecker(link: ProcessedLink) {
    return !{
      descendant: true,
      next: !ensure(showNextLinksCheckbox).checked
    }[link.kind];
  };

  function applyLinkFilter(kind: LinkKind, checkbox: HTMLInputElement) {
    const useLinks = checkbox.checked;
    let { nodes, links } = graph.graphData();
    if ( !useLinks ) {
      links = links.filter(l => l.kind !== kind);
    } else {
      links.push(...data.links.filter(l => l.kind === kind));
    }
    graph.graphData({ nodes, links });
  };


  function applyCheckboxFilters(firstTime = false) {
    mapValues( {
      next: useNextLinksCheckbox,
      descendant: useDescendantLinksCheckbox
    }, (checkbox, kind) => $with(ensure(checkbox), checkbox => {
      applyLinkFilter(kind, checkbox);
      if ( firstTime ) {
        checkbox.addEventListener('change', () => {
          applyLinkFilter(kind, checkbox);
          if ( kind === 'next' ) {
            ensure(showNextLinksContainer).style.display = checkbox.checked ? 'block' : 'none';
          };
        });
      };
    }) );
  };

  applyCheckboxFilters(true);

  ensure(showNextLinksCheckbox).addEventListener('change', () => {
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

  ensure(filterInput).addEventListener('keyup', e => {
    if ( e.key === 'Enter' ) {
      const filter = ensure(filterInput).value.toLowerCase();
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
      applyCheckboxFilters();
    }
  });

};