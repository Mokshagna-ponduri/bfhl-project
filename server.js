const express = require('express');
const cors = require('cors');

const app = express();

app.use(cors());
app.use(express.json());

function isValidEdge(edge) {
    if (!edge || typeof edge !== "string") return false;

    const trimmed = edge.trim();

    if (!/^[A-Z]->[A-Z]$/.test(trimmed)) return false;

    const [parent, child] = trimmed.split("->");

    if (parent === child) return false;

    return true;
}
function processDuplicates(edges) {
    const seen = new Set();
    const duplicates = [];
    const unique = [];

    edges.forEach(edge => {
        if (!seen.has(edge)) {
            seen.add(edge);
            unique.push(edge);
        } else {
            if (!duplicates.includes(edge)) {
                duplicates.push(edge);
            }
        }
    });

    return { unique, duplicates };
}
function buildGraph(edges) {
    const graph = {};
    const childSet = new Set();
    const assignedChild = new Set(); // tracks children already assigned

    edges.forEach(edge => {
        const [parent, child] = edge.split("->");

        // skip if child already has a parent
        if (assignedChild.has(child)) return;

        if (!graph[parent]) graph[parent] = [];
        graph[parent].push(child);

        childSet.add(child);
        assignedChild.add(child);
    });

    return { graph, childSet };
}

const processed = new Set();
function findRoots(graph, childSet) {
    return Object.keys(graph).filter(node => !childSet.has(node));
}
function dfs(node, graph, visited, recStack) {
    // cycle detected
    if (recStack.has(node)) {
        return { cycle: true };
    }

    // already processed node
    if (visited.has(node)) {
        return { tree: {} };
    }

    visited.add(node);
    recStack.add(node);

    let subtree = {};

    if (graph[node]) {
        for (let child of graph[node]) {
            const result = dfs(child, graph, visited, recStack);

            if (result.cycle) return { cycle: true };

            subtree[child] = result.tree;
        }
    }

    recStack.delete(node);

    return { tree: subtree };
}
function calculateDepthFromRoot(root, graph) {
    if (!graph[root] || graph[root].length === 0) return 1;

    let max = 0;

    for (let child of graph[root]) {
        max = Math.max(max, calculateDepthFromRoot(child, graph));
    }

    return max + 1;
}
function calculateDepth(node, graph) {
    if (!graph[node] || graph[node].length === 0) {
        return 1;
    }

    let max = 0;

    for (let child of graph[node]) {
        max = Math.max(max, calculateDepth(child, graph));
    }

    return max + 1;
}
app.post('/bfhl', (req, res) => {
    const data = req.body.data || [];

    let valid = [];
    let invalid = [];

    data.forEach(edge => {
        if (isValidEdge(edge)) valid.push(edge.trim());
        else invalid.push(edge);
    });

    const { unique, duplicates } = processDuplicates(valid);
    const { graph } = buildGraph(unique);

    // ✅ declare BEFORE using
    const hierarchies = [];
    let totalTrees = 0;
    let totalCycles = 0;
    let maxDepth = 0;
    let largestRoot = "";

    // ✅ STEP 1: find all children
    const allChildren = new Set();
    Object.values(graph).forEach(children => {
        children.forEach(c => allChildren.add(c));
    });

    // ✅ find roots
    const roots = Object.keys(graph).filter(node => !allChildren.has(node));

    // ✅ STEP 2: process trees
    roots.forEach(root => {
        const result = dfs(root, graph, new Set(), new Set());

        if (!result.cycle) {
            const tree = { [root]: result.tree };
            const depth = calculateDepth(root, graph);

            hierarchies.push({
                root,
                tree,
                depth
            });

            totalTrees++;

            if (depth > maxDepth) {
                maxDepth = depth;
                largestRoot = root;
            }
        }
    });

    // ✅ STEP 3: detect cycles
    for (let node of Object.keys(graph)) {
        const result = dfs(node, graph, new Set(), new Set());

        if (result.cycle) {
            hierarchies.push({
                root: node,
                tree: {},
                has_cycle: true
            });

            totalCycles++;
            break;
        }
    }

    res.json({
        user_id: "mokshagna@0812",
        email_id: "lakshmi_ponduri@srmap.edu.in",
        college_roll_number: "22122005",
        hierarchies,
        invalid_entries: invalid,
        duplicate_edges: duplicates,
        summary: {
            total_trees: totalTrees,
            total_cycles: totalCycles,
            largest_tree_root: largestRoot
        }
    });
});
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => console.log(`Server running on ${PORT}`));
