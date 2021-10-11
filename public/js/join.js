function join(issubmit) {
  var form = document.getElementById("join_form");
  var uesr_name = document.getElementById("user_name");
  if (uesr_name.value == "") {
    alert("請輸入使用者名稱");
  } else {
    document.cookie = `user_name=${uesr_name.value}; path=/;`;
    if(!issubmit)
      form.submit();
  }
}