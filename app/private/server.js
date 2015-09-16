(function() {
  Meteor.startup(function() {
    var db;
    db = new Neo4jDB('http://localhost:7474', {
      username: 'neo4j',
      password: '1234'
    });
    if (!db.queryOne('MATCH (n) RETURN n LIMIT 1')) {
      db.querySync('WITH ["Andres","Wes","Rik","Mark","Peter","Kenny","Michael","Stefan","Max","Chris"] AS names FOREACH (r IN range(0,19) | CREATE (:Person {removed: false, updatedAt: timestamp(), createdAt: timestamp(), name:names[r % size(names)]+" "+r}));');
    }
    return Meteor.methods({
      graph: function(timestamp) {
        var edge, edges, graph, i, j, k, key, len, len1, len2, n, node, nodes, r, ref, ref1, row, value, visGraph;
        if (timestamp == null) {
          timestamp = 0;
        }
        check(timestamp, Number);
        nodes = [];
        edges = [];
        visGraph = {
          nodes: [],
          edges: []
        };
        graph = db.graph('MATCH (a)-[r]-(b), (n) WHERE n.createdAt >= {timestamp} OR n.updatedAt >= {timestamp} RETURN DISTINCT n, r', {
          timestamp: timestamp
        }).fetch();
        if (graph.length === 0) {
          graph = db.graph('MATCH n WHERE n.createdAt >= {timestamp} OR n.updatedAt >= {timestamp} RETURN DISTINCT n', {
            timestamp: timestamp
          }).fetch();
        }
        for (i = 0, len = graph.length; i < len; i++) {
          row = graph[i];
          if (row.nodes.length > 0) {
            ref = row.nodes;
            for (j = 0, len1 = ref.length; j < len1; j++) {
              n = ref[j];
              node = {
                id: n.id,
                labels: n.labels,
                label: n.properties.name,
                group: n.labels[0]
              };
              node = _.extend(node, n.properties);
              nodes[n.id] = node;
            }
          }
          if (row.relationships.length > 0) {
            ref1 = row.relationships;
            for (k = 0, len2 = ref1.length; k < len2; k++) {
              r = ref1[k];
              edge = {
                id: r.id,
                from: r.startNode || r.start,
                to: r.endNode || r.end,
                type: r.type,
                label: r.type,
                arrows: 'to'
              };
              edges[r.id] = _.extend(edge, r.properties);
            }
          }
        }
        visGraph.edges = (function() {
          var results;
          results = [];
          for (key in edges) {
            value = edges[key];
            results.push(value);
          }
          return results;
        })();
        visGraph.nodes = (function() {
          var results;
          results = [];
          for (key in nodes) {
            value = nodes[key];
            results.push(value);
          }
          return results;
        })();
        return visGraph;
      },
      createNode: function(form) {
        var n;
        check(form, Object);
        n = db.nodes({
          description: form.description,
          name: form.name,
          createdAt: +(new Date),
          updatedAt: +(new Date)
        }).replaceLabels([form.label]).get();
        n.label = n.name;
        n.group = n.labels[0];
        return n;
      },
      updateNode: function(form) {
        var n;
        check(form, Object);
        form.id = parseInt(form.id);
        n = db.nodes(form.id).setProperties({
          description: form.description,
          name: form.name,
          updatedAt: +(new Date)
        }).replaceLabels([form.label]).get();
        n.label = n.name;
        n.group = n.labels[0];
        return n;
      },
      deleteNode: function(id) {
        var n;
        check(id, Match.OneOf(String, Number));
        id = parseInt(id);

        /*
        First we set node to removed state, so all other clients will remove that node on long-polling
        After 30 seconds we will get rid of the node from Neo4j, if it still exists
         */
        n = db.nodes(id);
        if (!n.property('removed')) {
          n.setProperties({
            removed: true,
            updatedAt: +(new Date)
          });
          Meteor.setTimeout(function() {
            n = db.nodes(id);
            if (n != null ? typeof n.get === "function" ? n.get() : void 0 : void 0) {
              return n["delete"]();
            }
          }, 30000);
        }
        return true;
      },
      createRelationship: function(form) {
        var n1, n2, r;
        check(form, Object);
        form.to = parseInt(form.to);
        form.from = parseInt(form.from);
        n1 = db.nodes(form.from);
        n2 = db.nodes(form.to);
        n1.setProperty('updatedAt', +(new Date));
        n2.setProperty('updatedAt', +(new Date));
        r = n1.to(n2, form.type, {
          description: form.description
        }).get();
        r.from = r.start;
        r.to = r.end;
        r.type = r.type;
        r.label = r.type;
        r.arrows = 'to';
        return r;
      },
      updateRelationship: function(form) {
        var n1, n2, oldRel, r;
        check(form, Object);
        form.to = parseInt(form.to);
        form.from = parseInt(form.from);
        form.id = parseInt(form.id);
        oldRel = db.getRelation(form.id);

        /*
        If this relationship already marked as removed, then it changed by someone else
        We will just wait for long-polling updates on client
         */
        if (!oldRel.property('removed')) {
          oldRel.setProperties({
            removed: true,
            updatedAt: +(new Date)
          });
          Meteor.setTimeout(function() {
            var r;
            r = db.getRelation(form.id);
            if (r != null ? typeof r.get === "function" ? r.get() : void 0 : void 0) {
              return r["delete"]();
            }
          }, 30000);
          n1 = db.nodes(form.from);
          n2 = db.nodes(form.to);
          n1.setProperty('updatedAt', +(new Date));
          n2.setProperty('updatedAt', +(new Date));
          r = n1.to(n2, form.type, {
            description: form.description
          }).get();
          r.from = r.start;
          r.to = r.end;
          r.type = r.type;
          r.label = r.type;
          r.arrows = 'to';
          return r;
        } else {
          return true;
        }
      },
      deleteRelationship: function(id) {
        var r;
        check(id, Match.OneOf(String, Number));
        id = parseInt(id);

        /*
        First we set relationship to removed state, so all other clients will remove that relationship on long-polling
        After 30 seconds we will get rid of the relationship from Neo4j, if it still exists
         */
        r = db.getRelation(id);
        if (!r.property('removed')) {
          r.setProperties({
            removed: true,
            updatedAt: +(new Date)
          });
          Meteor.setTimeout(function() {
            r = db.getRelation(id);
            if (r != null ? typeof r.get === "function" ? r.get() : void 0 : void 0) {
              return r["delete"]();
            }
          }, 30000);
        }
        return true;
      }
    });
  });

}).call(this);

