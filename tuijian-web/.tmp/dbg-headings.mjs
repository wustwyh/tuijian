const ids = ["964d7f04-6728-4570-a681-c4d800058042","1a8ad054-0499-416f-9d13-73e23438d54f","598058b7-ce0b-46d6-94b2-467a111e96fb","304f1716-7c44-4035-878a-96a349fbfc16","2fd68911-a442-4d55-b074-9fc8c2e39003","3594e12d-14cb-4367-b4cd-6d1b05f64c5d"];
for (const id of ids) {
  const j = await (await fetch(`http://localhost:5173/api/generations/${id}`)).json();
  const a = j.result?.article; if (!a) continue;
  const lines = (a.body || "").split(/\r?\n/).filter((l) => /^\s*#{1,6}\s/.test(l));
  console.log(`${j.summary.platform} ${id.slice(0,8)} 标题行=${lines.length}`);
  lines.slice(0, 6).forEach((l) => console.log("   " + l.slice(0, 46)));
}
